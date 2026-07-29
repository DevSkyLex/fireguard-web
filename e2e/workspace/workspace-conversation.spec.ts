import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

const ORGANIZATION = organizationOutput();
const CHANNEL_ID = 'c1';

interface MessageRow {
  readonly id: string;
  readonly author: string;
  readonly authorDisplayName?: string;
  readonly createdAt: string;
  readonly body?: string;
  readonly references?: readonly {
    readonly type: string;
    readonly id: string;
    readonly label: string | null;
    readonly code: string | null;
  }[];
  readonly attachments?: readonly { readonly id: string; readonly fileName: string }[];
}

/** Mocks the single-channel read the conversation page performs. */
async function mockChannel(page: Page): Promise<void> {
  await page.route(new RegExp(`/api/channels/${CHANNEL_ID}$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': '/.well-known/genid/abcd',
        '@type': 'ChannelOutput',
        id: CHANNEL_ID,
        organization: `/api/organizations/${ORGANIZATION.id}`,
        name: 'Bâtiment Nord',
        participantCount: 3,
        isArchived: false,
        messagesCount: 12,
        unreadCount: 0,
        createdAt: '2026-01-01T00:00:00+00:00',
        updatedAt: '2026-01-01T00:00:00+00:00',
        isFavorite: false,
      }),
    });
  });
}

function messagePayload(row: MessageRow): Record<string, unknown> {
  return {
    '@id': `/api/messages/${row.id}`,
    '@type': 'MessageOutput',
    id: row.id,
    conversation: `/api/conversations/${CHANNEL_ID}`,
    authorMember: `/api/organizations/${ORGANIZATION.id}/members/${row.author}`,
    authorDisplayName: row.authorDisplayName ?? 'Amélie Rousseau',
    body: row.body ?? '<p>Rien à signaler.</p>',
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: (row.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      contentUrl: `/api/attachments/${attachment.id}/content`,
      fileName: attachment.fileName,
      mimeType: 'application/pdf',
      size: 1024,
      uploadedAt: row.createdAt,
    })),
    reactions: [],
    isSaved: false,
    replyCount: 0,
    references: row.references ?? [],
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
  };
}

/** Mocks `GET /api/conversations/{id}/messages`, oldest first. */
async function mockThread(page: Page, rows: readonly MessageRow[]): Promise<void> {
  await page.route(/\/api\/conversations\/[^/]+\/messages(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': `/api/conversations/${CHANNEL_ID}/messages`,
        '@type': 'Collection',
        totalItems: rows.length,
        member: rows.map(messagePayload),
      }),
    });
  });
}

/** Mocks `GET /api/saved-messages`. */
async function mockSaved(page: Page, rows: readonly MessageRow[]): Promise<void> {
  await page.route(/\/api\/saved-messages(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': '/api/saved-messages',
        '@type': 'Collection',
        totalItems: rows.length,
        member: rows.map((row) => ({ ...messagePayload(row), isSaved: true })),
      }),
    });
  });
}

async function openConversation(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await mockChannel(page);

  await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);
  await expect(page.getByTestId('channel-conversation')).toBeVisible();
}

/**
 * The conversation column: thread grouping, message anatomy, and the composer.
 */
test.describe('Workspace conversation', () => {
  test('separates days and folds a same-author run into one header', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannel(page);
    await mockThread(page, [
      { id: 'm1', author: 'member-1', createdAt: '2026-07-20T09:00:00+00:00' },
      { id: 'm2', author: 'member-1', createdAt: '2026-07-20T09:02:00+00:00' },
      { id: 'm3', author: 'member-2', createdAt: '2026-07-21T08:00:00+00:00' },
    ]);

    await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);

    const thread = page.getByTestId('channel-conversation');
    await expect(thread.getByTestId('channel-conversation-day')).toHaveCount(2);

    // The run's second message drops its avatar; the new day's does not.
    const rows = thread.locator('app-message-row');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator('p-avatar')).toHaveCount(1);
    await expect(rows.nth(1).locator('p-avatar')).toHaveCount(0);
    await expect(rows.nth(2).locator('p-avatar')).toHaveCount(1);
  });

  test('keeps the message actions reachable and out of the way on touch', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannel(page);
    await mockThread(page, [
      { id: 'm1', author: 'member-1', createdAt: '2026-07-20T09:00:00+00:00' },
      { id: 'm2', author: 'member-2', createdAt: '2026-07-20T09:30:00+00:00' },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);

    const rows = page.getByTestId('channel-conversation').locator('app-message-row');
    const toolbar = rows.nth(1).getByTestId('message-row-toolbar');

    // A touch device fires no hover, so a hover-only toolbar simply does not
    // exist there — and an absolutely positioned one would sit on top of the
    // message above instead.
    await expect(toolbar).toBeVisible();

    const bar = await toolbar.boundingBox();
    const previous = await rows.nth(0).boundingBox();

    expect(bar?.height ?? 0).toBeGreaterThanOrEqual(36);
    expect(bar?.y ?? 0).toBeGreaterThan((previous?.y ?? 0) + (previous?.height ?? 0) - 1);
  });

  test('heads every message with its author name, never an identifier', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannel(page);
    await mockThread(page, [
      {
        id: 'm1',
        author: '019f8d61-4a6b-72a6-bf1e-110661241d9d',
        authorDisplayName: 'Amélie Rousseau',
        createdAt: '2026-07-20T09:00:00+00:00',
      },
      {
        id: 'm2',
        author: '019f8d61-0e71-7635-ac89-e421101715f8',
        authorDisplayName: 'Daniel Anderson',
        createdAt: '2026-07-20T09:30:00+00:00',
      },
    ]);

    await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);

    const thread = page.getByTestId('channel-conversation');
    await expect(thread).toContainText('Amélie Rousseau');
    await expect(thread).toContainText('Daniel Anderson');
    // The name used to be the trailing segment of the author IRI.
    await expect(thread).not.toContainText('019f8d61');
  });

  test('renders a reference card and an attachment chip', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannel(page);
    await mockThread(page, [
      {
        id: 'm1',
        author: 'member-1',
        createdAt: '2026-07-20T09:00:00+00:00',
        references: [
          { type: 'non_conformity', id: 'nc-1', label: 'Extincteur manquant', code: 'NC-204' },
        ],
        attachments: [{ id: 'a1', fileName: 'rapport.pdf' }],
      },
    ]);

    await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);

    const card = page.locator('app-message-reference-card');
    await expect(card).toContainText('Extincteur manquant');
    await expect(card).toContainText('NC-204');
    // Severity is paired with the spelled-out type, never colour alone.
    await expect(card).toContainText('Non-conformity');
    await expect(page.getByTestId('channel-conversation')).toContainText('rapport.pdf');
  });

  test('inserts an emoji at the caret from the composer palette', async ({ page }) => {
    await mockThread(page, []);
    await openConversation(page);

    const input = page.getByTestId('message-composer-input');
    await input.fill('ok');
    // Caret between the two characters.
    await input.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(1, 1));

    await page.getByTestId('message-composer-emoji').click();
    await page.getByRole('button', { name: '🔥', exact: true }).click();

    await expect(input).toHaveValue('o🔥k');
  });

  test('opens the saved view from the sidebar', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockSaved(page, [
      {
        id: 'm9',
        author: 'member-1',
        createdAt: '2026-07-20T09:00:00+00:00',
        body: '<p>Rapport annuel à relire.</p>',
      },
    ]);

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION.id);

    await page
      .locator('app-collaboration-channel-nav')
      .getByRole('link', { name: 'Saved' })
      .click();

    await expect(page).toHaveURL(`/organizations/${ORGANIZATION.id}/saved`);
    await expect(page.getByTestId('saved-messages')).toContainText('Rapport annuel à relire.');
  });

  test('shows an empty state when nothing is saved', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockSaved(page, []);

    await page.goto(`/organizations/${ORGANIZATION.id}/saved`);

    await expect(page.getByTestId('saved-messages')).toContainText('Nothing saved yet');
  });
});
