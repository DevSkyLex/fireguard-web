import { expect, test, type Page, type Route } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { readMessagingOutbox, setAppOffline, setAppOnline } from '../support/helpers/offline';
import { ApiMock } from '../support/mocks/api-mock';

const ORGANIZATION = organizationOutput();
const CHANNEL_ID = 'c1';

function json(page: Page, pattern: RegExp, body: unknown): Promise<void> {
  return page.route(pattern, (route) =>
    route.fulfill({ status: 200, contentType: 'application/ld+json', body: JSON.stringify(body) }),
  );
}

function envelope(rows: readonly unknown[]): Record<string, unknown> {
  return { '@id': '/x', '@type': 'Collection', totalItems: rows.length, member: rows };
}

function channel(): Record<string, unknown> {
  return {
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
  };
}

/** Everything the conversation reads, before the send route is installed. */
async function mockConversation(page: Page): Promise<void> {
  await json(page, /\/api\/channels(\?.*)?$/, envelope([channel()]));
  await json(page, new RegExp(`/api/channels/${CHANNEL_ID}$`), channel());
  await json(page, new RegExp(`/api/channels/${CHANNEL_ID}/participants$`), envelope([]));
  await json(page, /\/api\/conversations\/[^/]+\/activity(\?.*)?$/, envelope([]));
  await json(page, /\/api\/conversations\/[^/]+\/messages(\?.*)?$/, envelope([]));
  await json(page, /\/api\/conversations\/[^/]+\/pinned-messages(\?.*)?$/, envelope([]));
  await json(page, /\/api\/conversations\/[^/]+\/attachments(\?.*)?$/, envelope([]));
  await json(page, /\/api\/conversations\/[^/]+\/links(\?.*)?$/, envelope([]));
}

async function openChannel(page: Page): Promise<void> {
  await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);
  await expect(page.getByTestId('channel-conversation')).toBeVisible();
}

async function compose(page: Page, body: string): Promise<void> {
  await page.getByTestId('message-composer-input').fill(body);
  await page.getByTestId('message-composer-send').click();
}

/**
 * The offline round trip: compose with no network, see the message held, come
 * back online, watch it leave.
 */
test.describe('Workspace offline messaging', () => {
  test('keeps a message composed offline and replays it on reconnection', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockConversation(page);

    // The send route fails while "offline", then succeeds. Nothing about the
    // request changes between the two — only whether the server answers.
    let online = false;
    const sentBodies: string[] = [];
    await page.route(
      new RegExp(`/api/conversations/${CHANNEL_ID}/messages/[0-9a-f-]{36}$`),
      async (route: Route) => {
        if (!online) return route.abort('internetdisconnected');

        const payload = route.request().postDataJSON() as { body: string };
        sentBodies.push(payload.body);
        const clientId: string = route.request().url().split('/').pop() ?? '';

        return route.fulfill({
          status: 201,
          contentType: 'application/ld+json',
          body: JSON.stringify({
            '@id': `/api/messages/${clientId}`,
            '@type': 'Message',
            id: clientId,
            conversation: `/api/conversations/${CHANNEL_ID}`,
            authorMember: `/api/organizations/${ORGANIZATION.id}/members/mem-1`,
            body: payload.body,
            mentions: [],
            isDeleted: false,
            attachments: [],
            reactions: [],
            isSaved: false,
            replyCount: 0,
            references: [],
            createdAt: '2026-07-22T09:00:00+00:00',
            updatedAt: '2026-07-22T09:00:00+00:00',
          }),
        });
      },
    );

    await openChannel(page);
    await setAppOffline(page);

    await compose(page, 'Extincteur 3 non conforme.');

    // The message is on screen immediately, and marked as not sent.
    const thread = page.getByTestId('channel-conversation');
    await expect(thread).toContainText('Extincteur 3 non conforme.');
    await expect(page.getByTestId('message-row-failed')).toBeVisible();

    // And it is durable, not just in memory.
    await expect
      .poll(async () => (await readMessagingOutbox(page)).length, { timeout: 5000 })
      .toBe(1);

    const [queued] = await readMessagingOutbox(page);
    expect(queued.conversationId).toBe(CHANNEL_ID);
    expect(queued.payload.input.body).toBe('Extincteur 3 non conforme.');

    // The header says so too.
    await expect(page.getByTestId('messaging-sync-chip')).toBeVisible();

    online = true;
    await setAppOnline(page);

    // The coordinator drains without anyone touching the conversation.
    await expect
      .poll(async () => (await readMessagingOutbox(page)).length, { timeout: 15_000 })
      .toBe(0);

    expect(sentBodies).toEqual(['Extincteur 3 non conforme.']);
    // Mounted but hidden — asserted as both, because `toBeHidden()` alone also
    // passes for an element that was never rendered, which is exactly the bug
    // this guards against: a `role="status"` inserted together with its text is
    // a region the screen reader has never seen, and the announcement is lost.
    await expect(page.getByTestId('message-row-failed')).toBeAttached();
    await expect(page.getByTestId('message-row-failed')).toBeHidden();
  });

  test('replays a lost send under the same id and treats the conflict as done', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockConversation(page);

    const urls: string[] = [];
    let firstAttempt = true;
    await page.route(
      new RegExp(`/api/conversations/${CHANNEL_ID}/messages/[0-9a-f-]{36}$`),
      async (route: Route) => {
        urls.push(route.request().url());

        // First attempt dies after leaving the browser — the case that would
        // duplicate without a client-minted id.
        if (firstAttempt) {
          firstAttempt = false;

          return route.abort('connectionfailed');
        }

        // The replay hits the id that was already used.
        return route.fulfill({
          status: 409,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            '@id': '',
            '@type': 'Error',
            status: 409,
            type: '/problems/client-resource-already-exists',
            title: 'Conflict',
            detail: 'A resource with this client identifier already exists.',
          }),
        });
      },
    );

    await openChannel(page);
    await compose(page, 'Rapport transmis.');

    // Still online, so the coordinator replays on its own within milliseconds —
    // there is no window in which the member would have to click anything.
    await expect.poll(() => urls.length, { timeout: 10_000 }).toBe(2);

    // The replay reuses the very same URL: the id *is* the message's identity,
    // which is what makes a lost response impossible to turn into a duplicate.
    expect(urls[0]).toBe(urls[1]);

    // A 409 means the server already has it: the queue drains and no error is
    // left on screen.
    await expect
      .poll(async () => (await readMessagingOutbox(page)).length, { timeout: 10_000 })
      .toBe(0);
    // Mounted but hidden — asserted as both, because `toBeHidden()` alone also
    // passes for an element that was never rendered, which is exactly the bug
    // this guards against: a `role="status"` inserted together with its text is
    // a region the screen reader has never seen, and the announcement is lost.
    await expect(page.getByTestId('message-row-failed')).toBeAttached();
    await expect(page.getByTestId('message-row-failed')).toBeHidden();
    await expect(page.getByTestId('channel-conversation')).toContainText('Rapport transmis.');
  });

  test('shows nothing in the header while everything is fine', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockConversation(page);

    await openChannel(page);

    // A permanent indicator that usually reads "fine" trains people to stop
    // reading it.
    await expect(page.getByTestId('messaging-sync-chip')).toHaveCount(0);
  });
});
