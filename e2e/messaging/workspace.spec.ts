import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The messaging workspace (`/messages`) — conversation list, thread, composer.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const conversation = (id: string, name: string, isChannel: boolean, unreadCount = 0) => ({
  '@id': `/api/conversations/${id}`,
  '@type': 'Conversation',
  id,
  organization: 'org',
  subjectType: 'none',
  subject: null,
  subjectLabel: name,
  visibility: isChannel ? 'public' : 'direct',
  lastMessageAt: '2026-07-01T10:00:00+00:00',
  messagesCount: 2,
  isArchived: false,
  unreadCount,
  createdAt: '2026-01-01T00:00:00+00:00',
  updatedAt: '2026-07-01T10:00:00+00:00',
  isChannel,
  name: isChannel ? name : null,
  team: null,
  isFavorite: false,
});

const message = (id: string, body: string | null, createdAt: string, isDeleted = false) => ({
  '@id': `/api/messages/${id}`,
  '@type': 'Message',
  id,
  conversation: 'c1',
  // A member IRI, as the API sends it — a bare id here would re-validate the
  // contract the frontend used to imagine instead of the real one.
  authorMember: '/api/organizations/e2e-org-1/members/member-abc',
  body,
  mentions: [],
  editedAt: null,
  isDeleted,
  deletedAt: null,
  attachments: [],
  pinnedAt: null,
  pinnedBy: null,
  // Shape the API actually sends: aggregated server-side with a `reactedByMe`
  // flag. It never sends reactor ids — a fixture that did let a contract bug
  // through unnoticed.
  reactions:
    id === 'm1'
      ? [
          { emoji: '👍', count: 2, reactedByMe: true },
          { emoji: '🔥', count: 1, reactedByMe: false },
        ]
      : [],
  isSaved: false,
  replyCount: id === 'm1' ? 2 : 0,
  createdAt,
  updatedAt: createdAt,
});

async function landOnMessaging(
  page: Page,
  conversationId?: string,
): Promise<{ sent: string[]; reacted: string[]; uploaded: string[] }> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  const sent: string[] = [];
  const reacted: string[] = [];
  const uploaded: string[] = [];

  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  // The signed-in member is the author and one of the reactors, so the thread
  // can prove it tells your own reaction from someone else's.
  await api.mockOrganizationAccess(organization.id, { id: 'member-abc' });

  await page.route(`${API_BASE_URL}/api/organizations/${organization.id}/members**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          {
            '@id': '/api/members/member-abc',
            '@type': 'OrganizationMember',
            id: 'member-abc',
            organizationId: organization.id,
            userId: 'u1',
            email: 'nadia@fireguard.test',
            firstName: 'Nadia',
            lastName: 'Rahal',
            avatarUrl: null,
            isActive: true,
            joinedAt: '2026-01-01T00:00:00+00:00',
            roleIds: [],
          },
        ],
        totalItems: 1,
      }),
    }),
  );

  await page.route(`${API_BASE_URL}/api/presence**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [{ memberId: 'member-abc', online: true, lastSeenAt: '2026-07-01T10:05:00+00:00' }],
        totalItems: 1,
      }),
    }),
  );

  await page.route(`${API_BASE_URL}/api/messages/**`, async (route) => {
    const url: string = route.request().url();
    const method: string = route.request().method();
    const path: string = decodeURIComponent(url.split('/messages/')[1] ?? '');
    reacted.push(`${method} ${path}`);

    if (path.endsWith('/attachments')) {
      uploaded.push(path);
      await route.fulfill({
        status: 201,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@id': '/api/messaging-attachments/att-2',
          '@type': 'MessagingAttachment',
          id: 'att-2',
          message: path.split('/')[0],
          conversation: 'c1',
          uploadedByMember: 'member-abc',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: 51200,
          label: null,
          revision: 1,
          uploadedAt: '2026-07-01T10:06:00+00:00',
        }),
      });
      return;
    }

    if (path.endsWith('/replies')) {
      if (method === 'POST') {
        const body = route.request().postDataJSON() as { body: string };
        sent.push(body.body);
        await route.fulfill({
          status: 201,
          contentType: 'application/ld+json',
          body: JSON.stringify(message('r3', body.body, '2026-07-01T10:10:00+00:00')),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          member: [message('r1', 'Checked the north wing too.', '2026-07-01T10:03:00+00:00')],
          totalItems: 1,
        }),
      });
      return;
    }

    // Pin and save return the updated message; reactions and every DELETE
    // return 204 with no body.
    if (method === 'POST' && /\/(pin|save)$/.test(path)) {
      const pinned: boolean = path.endsWith('/pin');
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          ...message('m1', 'Extinguisher check done on level 2.', '2026-07-01T10:00:00+00:00'),
          pinnedAt: pinned ? '2026-07-01T10:02:00+00:00' : null,
          isSaved: !pinned,
        }),
      });
      return;
    }

    await route.fulfill({ status: 204, body: '' });
  });

  await page.route(`${API_BASE_URL}/api/conversations**`, async (route) => {
    const url: string = route.request().url();

    if (url.includes('/subscription')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({ token: 'jwt', topic: 'conversation/c1' }),
      });
      return;
    }

    if (url.includes('/attachments')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          member: [
            {
              '@id': '/api/messaging-attachments/att-1',
              '@type': 'MessagingAttachment',
              id: 'att-1',
              message: 'm1',
              conversation: 'c1',
              uploadedByMember: 'member-abc',
              fileName: 'inspection-report.pdf',
              mimeType: 'application/pdf',
              size: 245760,
              label: null,
              revision: 1,
              uploadedAt: '2026-07-01T10:00:00+00:00',
            },
          ],
          totalItems: 1,
        }),
      });
      return;
    }

    if (url.includes('/messages')) {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { body: string };
        sent.push(body.body);
        await route.fulfill({
          status: 201,
          contentType: 'application/ld+json',
          body: JSON.stringify(message('m3', body.body, '2026-07-01T10:05:00+00:00')),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          member: [
            // Newest first, as the API orders them — the store must flip this.
            message('m2', null, '2026-07-01T10:01:00+00:00', true),
            message('m1', 'Extinguisher check done on level 2.', '2026-07-01T10:00:00+00:00'),
          ],
          totalItems: 2,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          conversation('c1', 'site-northgate', true, 3),
          conversation('c2', 'Ella Uzer', false),
        ],
        totalItems: 2,
      }),
    });
  });

  const query: string = conversationId === undefined ? '' : `?conversation=${conversationId}`;
  await page.goto(`/organizations/${organization.id}/messages${query}`);
  await expect(page.locator('#messaging')).toBeVisible();

  return { sent, reacted, uploaded };
}

/**
 * Opens the first channel from the SHELL sidebar — the only conversation list
 * there is now.
 */
async function openConversation(page: Page, conversationId: string = 'c1'): Promise<void> {
  await page.locator(`[data-conversation-id="${conversationId}"]`).click();
}

test.describe('Messaging workspace', () => {
  // The workspace has no conversation column of its own: the shell sidebar is
  // the single list, as in the prototype. A second one used to sit inside the
  // page and duplicate it.
  test('lists channels and direct conversations in the shell sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    const sidebar = page.getByTestId('messaging-sidebar');

    await expect(sidebar.getByText('site-northgate')).toBeVisible();
    await expect(sidebar.getByText('Ella Uzer')).toBeVisible();
    await expect(sidebar.getByText('Channels')).toBeVisible();
    await expect(page.getByTestId('messaging-sidebar-unread')).toHaveText('3');
    // No duplicate list inside the page.
    await expect(page.getByRole('complementary', { name: 'Conversations' })).toHaveCount(0);
  });

  test('invites the reader to pick a conversation before one is open', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await expect(page.getByText('Pick a conversation')).toBeVisible();
    await expect(page.getByTestId('message-composer')).toHaveCount(0);
  });

  // The API returns newest-first, which is the wrong order to read a
  // conversation in — the store flips it.
  test('opens a thread oldest first', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);

    const rows = page.getByTestId('message-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('Extinguisher check done on level 2.');
  });

  // A deleted message keeps its row so replies and reactions do not dangle.
  test('keeps a deleted message in place rather than dropping it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);

    await expect(page.getByText('This message was deleted.')).toBeVisible();
  });

  test('sends a message and appends it to the thread', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { sent } = await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('message-composer').fill('On my way.');
    await page.getByTestId('message-send').click();

    await expect(page.getByTestId('message-row')).toHaveCount(3);
    await expect(page.getByText('On my way.')).toBeVisible();
    expect(sent).toEqual(['On my way.']);
  });

  // The API sends a bare member id; the directory turns it into a name.
  test('names message authors from the member directory', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);

    await expect(page.getByTestId('message-author').first()).toHaveText('Nadia Rahal');
  });

  test('shows each reaction with its count', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);

    const chips = page.getByTestId('reaction-chip');
    await expect(chips).toHaveCount(2);
    await expect(chips.first()).toContainText('2');
  });

  // `reactedByMe` tells your own reaction from someone else's; the chip you
  // are part of reads as pressed.
  test('marks the reaction the signed-in member is part of', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);

    const chips = page.getByTestId('reaction-chip');
    await expect(chips.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'false');
  });

  test('removes a reaction the member already left', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { reacted } = await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('reaction-chip').first().click();

    await expect.poll(() => reacted).toEqual(['DELETE m1/reactions/👍']);
  });

  // Before this the open thread lived only in store state, so it could not be
  // linked to and did not survive a reload.
  test('puts the open conversation in the URL', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);

    await expect(page).toHaveURL(/conversation=c1/);
  });

  // A shared link must land on the thread, not on the empty state.
  test('opens the conversation named by the URL on arrival', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page, 'c1');

    await expect(page.getByTestId('message-row').first()).toContainText(
      'Extinguisher check done on level 2.',
    );
  });

  test('pins a message for the whole conversation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { reacted } = await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('pin-toggle').first().click();

    await expect.poll(() => reacted).toEqual(['POST m1/pin']);
    await expect(page.getByTestId('pinned-marker')).toBeVisible();
  });

  // Saving is personal; pinning is not. They must not share a control.
  test('saves a message for the current member only', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { reacted } = await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('save-toggle').first().click();

    await expect.poll(() => reacted).toEqual(['POST m1/save']);
    await expect(page.getByTestId('pinned-marker')).toHaveCount(0);
  });

  // Hidden until hover, but never removed from the tab order.
  test('keeps the row actions reachable by keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('pin-toggle').first().focus();

    await expect(page.getByTestId('pin-toggle').first()).toBeFocused();
  });

  // Status is never colour-only: the dot carries a screen-reader label.
  test('marks an online author with a labelled presence dot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);

    await expect(page.getByTestId('presence-dot').first()).toBeAttached();
    await expect(page.getByText('Online').first()).toBeAttached();
  });

  // The replies panel sits beside the thread, not over it: a reply almost
  // always needs the surrounding conversation for context.
  test('opens replies in a side panel without hiding the thread', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('open-thread').first().click();

    await expect(page.getByTestId('thread-panel')).toBeVisible();
    await expect(page.getByText('Checked the north wing too.')).toBeVisible();
    await expect(page.getByText('Extinguisher check done on level 2.').first()).toBeVisible();
  });

  test('posts a reply and bumps the root reply count', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { sent } = await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('open-thread').first().click();
    await page.getByTestId('reply-composer').fill('On it.');
    await page.getByTestId('reply-send').click();

    await expect.poll(() => sent).toEqual(['On it.']);
    await expect(page.getByTestId('open-thread').first()).toContainText('3');
  });

  test('closes the replies panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('open-thread').first().click();
    await page.getByTestId('close-thread').click();

    await expect(page.getByTestId('thread-panel')).toHaveCount(0);
  });

  test('shows an attachment as a download link on the message that carries it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await openConversation(page);

    const attachment = page.getByTestId('message-attachment');
    await expect(attachment).toContainText('inspection-report.pdf');
    await expect(attachment).toContainText('240 KB');
    // The chip is a plain cookie-authenticated link to the content endpoint.
    await expect(attachment).toHaveAttribute('href', /\/api\/messaging-attachments\/.+\/content$/);
    await expect(attachment).toHaveAttribute('download', 'inspection-report.pdf');
  });

  test('sends a message with a file attached', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { uploaded } = await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('message-composer-file-input').setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake'),
    });

    await expect(page.getByTestId('message-composer-staged-file')).toContainText('photo.jpg');

    await page.getByTestId('message-composer').fill('Here is the photo.');
    await page.getByTestId('message-send').locator('button').click();

    // Uploaded to the just-created message, not the composed one.
    await expect.poll(() => uploaded).toEqual(['m3/attachments']);
  });

  test('refuses to send an empty draft', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { sent } = await landOnMessaging(page);

    await openConversation(page);
    await page.getByTestId('message-composer').fill('   ');

    await expect(page.getByTestId('message-send').locator('button')).toBeDisabled();
    expect(sent).toEqual([]);
  });
});
