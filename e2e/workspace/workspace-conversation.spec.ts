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
  readonly replyCount?: number;
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
    replyCount: row.replyCount ?? 0,
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

/** Mocks the member directory the composer's mention picker offers from. */
async function mockMembers(page: Page): Promise<void> {
  await page.route(
    new RegExp(`/api/organizations/${ORGANIZATION.id}/members(\\?.*)?$`),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@id': `/api/organizations/${ORGANIZATION.id}/members`,
          '@type': 'Collection',
          totalItems: 1,
          member: [
            {
              '@id': `/api/organizations/${ORGANIZATION.id}/members/member-1`,
              '@type': 'OrganizationMemberOutput',
              id: 'member-1',
              displayName: 'Amélie Rousseau',
              roleNames: ['Manager'],
              isActive: true,
            },
          ],
        }),
      });
    },
  );
}

/**
 * Mocks a message's reply thread: the read, and the post that appends to it.
 *
 * Both share one URL and differ only by method — `GET /api/messages/{id}/replies`
 * is the *only* way to see a reply, since the conversation listing excludes them.
 */
async function mockReplies(page: Page, parentId: string, rows: MessageRow[]): Promise<void> {
  await page.route(
    new RegExp(`/api/messages/${parentId}/replies(\\?.*)?$`),
    async (route, request) => {
      if (request.method() === 'POST') {
        const posted: MessageRow = {
          id: `r${rows.length + 1}`,
          author: 'member-1',
          createdAt: '2026-07-20T10:00:00+00:00',
          body: String((request.postDataJSON() as { body?: string }).body ?? ''),
        };
        rows.push(posted);

        await route.fulfill({
          status: 201,
          contentType: 'application/ld+json',
          body: JSON.stringify(messagePayload(posted)),
        });

        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@id': `/api/messages/${parentId}/replies`,
          '@type': 'Collection',
          totalItems: rows.length,
          member: rows.map(messagePayload),
        }),
      });
    },
  );
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
    await expect(thread.getByTestId('chat-thread-day')).toHaveCount(2);

    // The run's second message drops its avatar; the new day's does not.
    const rows = thread.locator('app-chat-message');
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

    const rows = page.getByTestId('channel-conversation').locator('app-chat-message');
    const toolbar = rows.nth(1).getByTestId('chat-message-actions');

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
    /*
     * Caret between the two characters. The field is a contenteditable, not a
     * textarea, so there is no `setSelectionRange` — the caret is placed with a
     * DOM range, which is what the editor listens to.
     */
    await input.evaluate((el: HTMLElement) => {
      const text: ChildNode | null | undefined = el.querySelector('p')?.firstChild;

      if (!text) throw new Error('the editor has no text node to place the caret in');

      const range: Range = document.createRange();
      range.setStart(text, 1);
      range.collapse(true);

      const selection: Selection | null = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });

    await page.getByTestId('message-composer-emoji').click();
    await page.getByRole('button', { name: '🔥', exact: true }).click();

    await expect(input).toHaveText('o🔥k');
  });

  test('inserts a mention when the suggestion is clicked, not just typed', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannel(page);
    await mockThread(page, []);
    // After the session mock: Playwright matches the most recently registered
    // route first, and the session installs a catch-all safety net.
    await mockMembers(page);

    await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);
    await expect(page.getByTestId('channel-conversation')).toBeVisible();

    const input = page.getByTestId('message-composer-input');
    await input.click();
    await input.pressSequentially('ping @am');
    await expect(input).toHaveText('ping @am');

    const suggestion = page.getByTestId('message-composer-mentions').getByRole('option');
    await expect(suggestion).toHaveCount(1);

    /*
     * A real press, which is the whole point of this test: it moves focus out
     * of the editor before the click lands, and without the panel cancelling
     * `mousedown` the list unmounts underneath the pointer and nothing is
     * inserted. Synthetic events do not move focus and never caught this.
     */
    await suggestion.click();

    await expect(input).toHaveText('ping @Amélie Rousseau');
    await expect(page.getByTestId('message-composer-mentions')).toHaveCount(0);
  });

  test('keeps only the one-tap controls on the bar and the rest behind the trigger', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannel(page);
    await mockThread(page, [
      { id: 'm1', author: 'member-1', createdAt: '2026-07-20T09:00:00+00:00' },
    ]);

    await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);

    const row = page.getByTestId('channel-conversation').locator('app-chat-message').first();
    await row.hover();

    // Four quick reactions, the bookmark, and the overflow trigger. Pinning
    // used to sit here too; it is now one of the menu's entries.
    const bar = row.getByTestId('chat-message-actions');
    await expect(bar.locator('button')).toHaveCount(6);
    await expect(bar.locator('.pi-thumbtack')).toHaveCount(0);

    await row.getByTestId('chat-message-more').click();

    const menu = page.locator('.p-menu-overlay');
    await expect(menu).toBeVisible();
    await expect(menu.locator('.p-menu-item-label')).toHaveText([
      'Reply',
      'Copy message',
      'Mark as read',
      'Pin message',
      'Delete message',
    ]);
  });

  test('asks before deleting a message, then redacts the row in place', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannel(page);
    await mockThread(page, [
      {
        id: 'm1',
        author: 'member-1',
        createdAt: '2026-07-20T09:00:00+00:00',
        body: '<p>Extincteur 3 non conforme.</p>',
      },
    ]);
    await page.route(/\/api\/messages\/m1$/, async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);

    const row = page.getByTestId('channel-conversation').locator('app-chat-message').first();
    await row.hover();
    await row.getByTestId('chat-message-more').click();
    await page.locator('.p-menu-overlay').getByText('Delete message').click();

    // A tombstone cannot be undone, so it is never one click away.
    const dialog = page.locator('.p-confirmdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete message' }).click();

    // The row survives, redacted — the API keeps it for compliance.
    await expect(row).toContainText('This message was deleted.');
    await expect(row).not.toContainText('Extincteur 3 non conforme.');
  });

  test('opens a message’s replies in a panel and posts one into it', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await mockChannel(page);
    await mockThread(page, [
      {
        id: 'm1',
        author: 'member-1',
        createdAt: '2026-07-20T09:00:00+00:00',
        body: '<p>Extincteur 3 non conforme.</p>',
        replyCount: 1,
      },
    ]);
    await mockReplies(page, 'm1', [
      {
        id: 'r1',
        author: 'member-2',
        authorDisplayName: 'Bruno Lemaire',
        createdAt: '2026-07-20T09:05:00+00:00',
        body: '<p>Je passe demain.</p>',
      },
    ]);

    await page.goto(`/organizations/${ORGANIZATION.id}/channels/${CHANNEL_ID}`);

    const row = page.getByTestId('channel-conversation').locator('app-chat-message').first();
    // The count is the discoverable way in; the overflow menu is the other.
    await row.getByTestId('chat-message-replies').click();

    const drawer = page.getByTestId('message-thread-drawer');
    await expect(drawer).toBeVisible();
    // The root message heads the panel, and its replies follow.
    await expect(drawer.getByTestId('message-thread-drawer-parent')).toContainText(
      'Extincteur 3 non conforme.',
    );
    await expect(drawer.locator('app-chat-thread app-chat-message')).toHaveCount(1);
    await expect(drawer).toContainText('Je passe demain.');

    const input = drawer.getByTestId('message-composer-input');
    await input.click();
    await input.pressSequentially('Vu.');
    await drawer.getByTestId('message-composer-send').click();

    await expect(drawer.locator('app-chat-thread app-chat-message')).toHaveCount(2);
    await expect(drawer).toContainText('Vu.');
    // The parent's count is corrected in place: there is no endpoint to refetch
    // a single message with.
    await expect(row.getByTestId('chat-message-replies')).toContainText('2 replies');
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
