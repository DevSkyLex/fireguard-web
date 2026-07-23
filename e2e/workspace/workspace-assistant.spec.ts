import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

const ORGANIZATION = organizationOutput();
const CHANNEL_ID = 'c1';
const THREAD_ID = 'thread-1';
const TOPIC = `/assistant/threads/${THREAD_ID}`;

function envelope(rows: readonly unknown[]): Record<string, unknown> {
  return { '@id': '/x', '@type': 'Collection', totalItems: rows.length, member: rows };
}

function json(page: Page, pattern: RegExp, body: unknown, status = 200): Promise<void> {
  return page.route(pattern, (route) =>
    route.fulfill({ status, contentType: 'application/ld+json', body: JSON.stringify(body) }),
  );
}

function turn(id: string, role: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    threadId: THREAD_ID,
    organizationId: ORGANIZATION.id,
    role,
    body: role === 'user' ? 'Where are we on inspections?' : '',
    status: role === 'user' ? 'complete' : 'pending',
    createdAt: '2026-07-22T10:00:00+00:00',
    ...overrides,
  };
}

/**
 * Serves the topic as a real `text/event-stream` body.
 *
 * `ApiMock` answers Mercure with an empty stream, so a spec that needs frames
 * has to replace that route — registered after the mock, since Playwright gives
 * precedence to the most recent registration.
 */
async function mockFrames(page: Page, frames: readonly Record<string, unknown>[]): Promise<void> {
  const body: string = frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join('');

  await page.route('http://localhost:3000/.well-known/mercure**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body }),
  );
}

/** Everything the assistant reads, plus the channel surfaces around it. */
async function mockAssistant(
  page: Page,
  overrides: { readonly ask?: Record<string, unknown> } = {},
): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });

  // The channel route the panel is opened from — the assistant itself is
  // organization-scoped and needs none of it.
  await json(page, /\/api\/organizations\/[^/]+\/members(\?.*)?$/, envelope([]));
  await json(
    page,
    /\/api\/channels(\?.*)?$/,
    envelope([
      {
        '@id': '/.well-known/genid/abcd',
        '@type': 'ChannelOutput',
        id: CHANNEL_ID,
        organization: `/api/organizations/${ORGANIZATION.id}`,
        name: 'Bâtiment Nord',
        participantCount: 1,
        isArchived: false,
        messagesCount: 0,
        unreadCount: 0,
        createdAt: '2026-05-28T09:00:00+00:00',
        updatedAt: '2026-07-21T09:00:00+00:00',
        isFavorite: false,
      },
    ]),
  );
  await json(
    page,
    /\/api\/conversations\/[^/]+\/(messages|activity|links|attachments|pinned-messages)(\?.*)?$/,
    envelope([]),
  );

  await json(
    page,
    /\/assistant\/threads$/,
    { '@id': `/api/assistant/threads/${THREAD_ID}`, '@type': 'AssistantThread', id: THREAD_ID },
    201,
  );
  await json(page, /\/assistant\/threads\/[^/]+\/subscription$/, {
    '@id': '/x',
    '@type': 'AssistantSubscription',
    topic: TOPIC,
    token: 'subscriber-jwt',
  });
  await json(
    page,
    /\/assistant\/threads\/[^/]+\/messages$/,
    overrides.ask ?? {
      '@id': '/x',
      '@type': 'AssistantAnswer',
      threadId: THREAD_ID,
      organizationId: ORGANIZATION.id,
      userMessage: turn('m-user', 'user'),
      assistantMessage: turn('m-bot', 'assistant'),
    },
    201,
  );
}

async function openChannel(page: Page): Promise<void> {
  await page.goto(`/organizations/${ORGANIZATION.id}/workspace/channels/${CHANNEL_ID}`);
}

test.describe('Workspace assistant', () => {
  test('takes the panel slot from the info panel, at the prototype width', async ({ page }) => {
    await mockAssistant(page);
    await mockFrames(page, []);
    await openChannel(page);

    // The channel route gives the slot to the info panel first.
    await expect(page.getByTestId('channel-info-panel')).toBeVisible();

    await page.getByTestId('assistant-toggle').click();

    await expect(page.getByTestId('assistant-transcript')).toBeVisible();
    await expect(page.getByTestId('channel-info-panel')).toHaveCount(0);

    const panel = page.locator('#workspace-panel');
    const box = await panel.boundingBox();
    const shell = await page.locator('#workspace-layout').boundingBox();

    expect(Math.round(box?.width ?? 0)).toBe(360);
    expect(Math.round(box?.height ?? 0)).toBe(Math.round(shell?.height ?? 0));
  });

  test('hands the slot back to the info panel when closed', async ({ page }) => {
    await mockAssistant(page);
    await mockFrames(page, []);
    await openChannel(page);

    await page.getByTestId('assistant-toggle').click();
    await expect(page.getByTestId('assistant-transcript')).toBeVisible();

    await page.getByTestId('assistant-panel-close').click();

    // The info panel was showing before, so it must come back — not stay
    // hidden because the assistant forced the shell flag on.
    await expect(page.getByTestId('channel-info-panel')).toBeVisible();
  });

  test('leaves the panel closed when the assistant is opened over a hidden one', async ({
    page,
  }) => {
    await mockAssistant(page);
    await mockFrames(page, []);
    await openChannel(page);

    // Hide the info panel first, so nothing was showing before the assistant.
    await page.getByTestId('channel-info-toggle').click();
    await expect(page.getByTestId('channel-info-panel')).toHaveCount(0);

    await page.getByTestId('assistant-toggle').click();
    await expect(page.getByTestId('assistant-transcript')).toBeVisible();

    await page.getByTestId('assistant-panel-close').click();

    await expect(page.locator('#workspace-panel')).toHaveCount(0);
  });

  test('gives the slot back when the info toggle reclaims it', async ({ page }) => {
    await mockAssistant(page);
    await mockFrames(page, []);
    await openChannel(page);

    await page.getByTestId('assistant-toggle').click();
    await expect(page.getByTestId('assistant-transcript')).toBeVisible();

    // While the assistant holds the slot the info toggle must read as off,
    // even though the shell's panel flag is on.
    const info = page.getByTestId('channel-info-toggle');
    await expect(info).toHaveAttribute('aria-expanded', 'false');

    await info.click();

    await expect(page.getByTestId('channel-info-panel')).toBeVisible();
    await expect(page.getByTestId('assistant-transcript')).toHaveCount(0);
    await expect(info).toHaveAttribute('aria-expanded', 'true');
  });

  test('creates the thread only on the first question', async ({ page }) => {
    await mockAssistant(page);
    await mockFrames(page, []);

    let threadsCreated = 0;
    await page.route(/\/assistant\/threads$/, (route) => {
      threadsCreated += 1;

      return route.fulfill({
        status: 201,
        contentType: 'application/ld+json',
        body: JSON.stringify({ '@id': '/x', '@type': 'AssistantThread', id: THREAD_ID }),
      });
    });

    await openChannel(page);
    await page.getByTestId('assistant-toggle').click();

    // Opening the panel must not leave an empty thread behind.
    await expect(page.getByTestId('assistant-intro')).toBeVisible();
    expect(threadsCreated).toBe(0);

    await page.getByTestId('assistant-input').fill('Where are we on inspections?');
    await page.getByTestId('assistant-send').click();

    await expect(page.getByTestId('assistant-thinking')).toBeVisible();
    expect(threadsCreated).toBe(1);
  });

  test('renders the reply from Mercure frames, which the thread read cannot supply', async ({
    page,
  }) => {
    await mockAssistant(page);
    await mockFrames(page, [
      { messageId: 'm-bot', status: 'streaming', body: 'Trois', tokenCount: null, errorCode: null },
      {
        messageId: 'm-bot',
        status: 'complete',
        body: 'Trois inspections sont en retard.',
        tokenCount: 24,
        errorCode: null,
      },
    ]);
    await openChannel(page);

    await page.getByTestId('assistant-toggle').click();
    await page.getByTestId('assistant-suggestion').first().click();

    await expect(page.getByTestId('assistant-message')).toHaveText(
      'Trois inspections sont en retard.',
    );
    // The spinner belongs to a reply with no body yet; it must go.
    await expect(page.getByTestId('assistant-thinking')).toHaveCount(0);
  });

  test('reports a failed generation instead of an empty bubble', async ({ page }) => {
    await mockAssistant(page);
    await mockFrames(page, [
      {
        messageId: 'm-bot',
        status: 'failed',
        body: '',
        tokenCount: null,
        errorCode: 'model_unavailable',
      },
    ]);
    await openChannel(page);

    await page.getByTestId('assistant-toggle').click();
    await page.getByTestId('assistant-suggestion').first().click();

    await expect(page.getByTestId('assistant-message-failed')).toContainText('model_unavailable');
  });
});
