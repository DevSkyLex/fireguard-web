import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { expectNoHorizontalOverflow } from './appearance';
import { mockMessagesWorkspace } from './direct-messages';

/** Exercises server cancellation, retry identity and obsolete live frames in the existing assistant sheet. */
export async function verifyAssistantAttempts(page: Page, info: TestInfo): Promise<void> {
  await mockMessagesWorkspace(page);
  await page.addInitScript(() => {
    class FakeEventSource extends EventTarget {
      public constructor(public readonly url: string) {
        super();
      }
      public close(): void {
        this.closed = true;
      }
      public closed = false;
    }
    const sockets: FakeEventSource[] = [];
    Object.defineProperty(window, 'EventSource', {
      value: class extends FakeEventSource {
        public constructor(url: string) {
          super(url);
          sockets.push(this);
        }
      },
    });
    window.addEventListener('assistant-test-frame', (event) => {
      for (const socket of sockets) {
        if (!socket.closed && socket.url.includes(encodeURIComponent('/assistant-test')))
          socket.dispatchEvent(
            new MessageEvent('message', { data: JSON.stringify((event as CustomEvent).detail) }),
          );
      }
    });
  });
  const root = `/api/organizations/${E2E_ORGANIZATION_ID}/assistant/threads`;
  const thread = {
    '@id': `${root}/thread`,
    '@type': 'AssistantThread',
    id: 'thread',
    organizationId: E2E_ORGANIZATION_ID,
    memberId: 'e2e-user-1',
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-09-21T10:00:00Z',
  };
  const user = {
    id: 'question',
    threadId: 'thread',
    organizationId: E2E_ORGANIZATION_ID,
    role: 'user',
    body: 'Summarise the open inspections.',
    status: 'complete',
    createdAt: '2026-09-21T10:00:00Z',
  };
  let reply = {
    id: 'reply',
    threadId: 'thread',
    organizationId: E2E_ORGANIZATION_ID,
    role: 'assistant',
    body: '',
    status: 'pending',
    createdAt: '2026-09-21T10:00:01Z',
    attemptId: 'attempt-1',
    attemptNumber: 1,
    attemptSequence: 0,
    canCancel: true,
    canRetry: false,
    tokenCount: null,
    errorCode: null,
  };
  let asks = 0;
  const controls: { action: string; attemptId: string }[] = [];
  await page.route(`**${root}**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/subscription'))
      return route.fulfill({ json: { topic: '/assistant-test', token: 'test-token' } });
    if (path.endsWith('/cancel') || path.endsWith('/retry')) {
      const action = path.endsWith('/cancel') ? 'cancel' : 'retry';
      controls.push({ action, attemptId: route.request().postDataJSON().attemptId as string });
      reply =
        action === 'cancel'
          ? { ...reply, status: 'cancelled', canCancel: false, canRetry: true, attemptSequence: 3 }
          : {
              ...reply,
              status: 'pending',
              body: '',
              canCancel: true,
              canRetry: false,
              attemptId: 'attempt-2',
              attemptNumber: 2,
              attemptSequence: 0,
            };
      return route.fulfill({
        json: { ...reply, '@id': `${root}/thread/messages/reply`, '@type': 'AssistantMessage' },
      });
    }
    if (path.endsWith('/messages')) {
      asks++;
      return route.fulfill({
        status: 201,
        json: {
          '@id': root,
          '@type': 'AskAssistantQuestion',
          threadId: 'thread',
          organizationId: E2E_ORGANIZATION_ID,
          userMessage: user,
          assistantMessage: reply,
        },
      });
    }
    return route.fulfill({
      status: route.request().method() === 'POST' ? 201 : 200,
      json: {
        ...thread,
        messages: [user, reply],
        messagesTotal: 2,
        messagesPage: 1,
        messagesItemsPerPage: 50,
      },
    });
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages`);
  if (info.project.name.includes('Mobile'))
    await page.getByTestId('dashboard-mobile-actions-trigger').click();
  await page.getByTestId('assistant-toggle').filter({ visible: true }).click();
  await page.getByTestId('assistant-input').fill(user.body);
  await page.getByTestId('assistant-send').click();
  await expect(page.getByTestId('assistant-cancel')).toBeVisible();
  reply = { ...reply, status: 'streaming', body: 'The review is in progress.', attemptSequence: 2 };
  await page.evaluate(
    (frame) => window.dispatchEvent(new CustomEvent('assistant-test-frame', { detail: frame })),
    { ...reply, messageId: 'reply' },
  );
  await page.getByTestId('assistant-input').fill('Keep this draft for later.');
  await page.getByTestId('assistant-cancel').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Generation stopped.', { exact: true }).last()).toBeVisible();
  await expect(page.getByTestId('assistant-retry')).toBeEnabled();
  const base = `e2e/artifacts/reliability/assistant-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${base}-cancelled.png`, fullPage: true, animations: 'disabled' });
  await page.getByTestId('assistant-retry').click();
  await expect(page.getByTestId('assistant-cancel')).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('assistant-test-frame', {
        detail: {
          messageId: 'reply',
          status: 'complete',
          body: 'Obsolete answer must never appear',
          attemptId: 'attempt-1',
          attemptNumber: 1,
          attemptSequence: 99,
          tokenCount: 1,
          errorCode: null,
        },
      }),
    ),
  );
  await expect(page.getByText('Obsolete answer must never appear')).toHaveCount(0);
  await page.evaluate(
    (frame) => window.dispatchEvent(new CustomEvent('assistant-test-frame', { detail: frame })),
    {
      ...reply,
      messageId: 'reply',
      status: 'complete',
      body: 'Three inspections remain open. Review their due dates before assigning the next visit.',
      attemptSequence: 2,
      canCancel: false,
    },
  );
  await expect(page.getByTestId('assistant-message')).toContainText('Three inspections');
  await expect(page.getByTestId('assistant-input')).toHaveValue('Keep this draft for later.');
  expect(asks).toBe(1);
  expect(controls).toEqual([
    { action: 'cancel', attemptId: 'attempt-1' },
    { action: 'retry', attemptId: 'attempt-1' },
  ]);
  await page.screenshot({ path: `${base}-complete.png`, fullPage: true, animations: 'disabled' });
}
