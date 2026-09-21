import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { directConversationOutput } from '../fixtures/direct-messages-fixtures';
import { expectNoHorizontalOverflow } from './appearance';
import { mockMessagesWorkspace } from './direct-messages';

/** Verifies account-owned IndexedDB failures, permission filtering and retry under the original client identity. */
export async function verifyFailedMessages(page: Page, info: TestInfo): Promise<void> {
  const api = await mockMessagesWorkspace(page);
  const conversation = directConversationOutput();
  await api.mockConversationDetail(conversation);
  await api.mockConversationDetail({
    ...directConversationOutput(8),
    organization: '/api/organizations/another-org',
  });
  await page.route('**/api/conversations/denied-conversation', (route) =>
    route.fulfill({ status: 404, json: { type: 'not-found', status: 404, detail: 'Not found' } }),
  );
  const requests: { url: string; header: string | undefined }[] = [];
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().includes('/messages/'))
      requests.push({ url: request.url(), header: request.headers()['if-none-match'] });
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages`);
  await expect(page.getByTestId('direct-messages-panel-failed')).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('fireguard-messaging', 1);
      request.addEventListener('upgradeneeded', () => {
        request.result.createObjectStore('outbox');
        request.result.createObjectStore('metadata');
      });
      request.addEventListener('error', () => reject(request.error));
      request.addEventListener('success', () => {
        const database = request.result;
        const transaction = database.transaction(['outbox', 'metadata'], 'readwrite');
        transaction.objectStore('metadata').put('e2e-user-1', 'ownerUserId');
        for (const [id, conversationId, body] of [
          ['failure-original', 'e2e-direct-2', 'Recovered message from the failed sends list.'],
          ['hidden-other', 'e2e-direct-8', 'Never expose another organization.'],
          ['hidden-denied', 'denied-conversation', 'Never expose a revoked conversation.'],
        ]) {
          transaction.objectStore('outbox').put(
            {
              id,
              conversationId,
              type: 'message.send',
              status: 'failed',
              error: 'Send rejected',
              createdAt: '2026-09-21T11:00:00Z',
              payload: { clientId: id + '-client', conversationId, input: { body } },
            },
            id,
          );
        }
        transaction.addEventListener('complete', () => {
          database.close();
          resolve();
        });
        transaction.addEventListener('error', () => reject(transaction.error));
      });
    });
  });
  await page.getByTestId('direct-messages-panel-failed').click();
  await expect(page.getByTestId('failed-send')).toHaveCount(1);
  await expect(page.getByTestId('failed-send')).toContainText('Recovered message');
  await expect(page.getByText('Never expose', { exact: false })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  const base = `e2e/artifacts/reliability/failed-messages-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({ path: `${base}-list.png`, fullPage: true, animations: 'disabled' });
  await page.getByTestId('failed-send-open').focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByTestId('message-thread').getByText('Recovered message from the failed sends list.'),
  ).toBeVisible();
  const retry = page.getByTestId('message-row-retry');
  await expect(retry).toBeEnabled();
  await page.screenshot({ path: `${base}-thread.png`, fullPage: true, animations: 'disabled' });
  await retry.click();
  await expect(retry).toHaveCount(0);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toMatchObject({ header: '*' });
  expect(requests[0].url).toContain('/messages/failure-original-client');
  const remaining = () =>
    page.evaluate(
      () =>
        new Promise<unknown>((resolve, reject) => {
          const request = indexedDB.open('fireguard-messaging', 1);
          request.addEventListener('error', () => reject(request.error));
          request.addEventListener('success', () => {
            const row = request.result
              .transaction('outbox', 'readonly')
              .objectStore('outbox')
              .get('failure-original');
            row.addEventListener('success', () => {
              request.result.close();
              resolve(row.result ?? null);
            });
            row.addEventListener('error', () => reject(row.error));
          });
        }),
    );
  await expect.poll(remaining).toBeNull();
}
