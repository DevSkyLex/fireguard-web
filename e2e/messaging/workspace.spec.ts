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
  authorMember: 'member-abc',
  body,
  mentions: [],
  editedAt: null,
  isDeleted,
  deletedAt: null,
  attachments: [],
  pinnedAt: null,
  pinnedBy: null,
  reactions: [],
  isSaved: false,
  replyCount: 0,
  createdAt,
  updatedAt: createdAt,
});

async function landOnMessaging(page: Page): Promise<{ sent: string[] }> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  const sent: string[] = [];

  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  await page.route(`${API_BASE_URL}/api/conversations**`, async (route) => {
    const url: string = route.request().url();

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

  await page.goto(`/organizations/${organization.id}/messages`);
  await expect(page.locator('#messaging')).toBeVisible();

  return { sent };
}

test.describe('Messaging workspace', () => {
  test('lists channels and direct conversations separately', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    // Scoped to the list: the signed-in e2e user shares the DM's name, and the
    // sidebar footer shows it too.
    const list = page.getByRole('complementary', { name: 'Conversations' });

    await expect(list.getByText('site-northgate')).toBeVisible();
    await expect(list.getByText('Ella Uzer')).toBeVisible();
    await expect(list.getByText('Channels')).toBeVisible();
    await expect(list.getByText('Direct messages')).toBeVisible();
    await expect(list.getByText('3', { exact: true })).toBeVisible();
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

    await page.getByTestId('conversation-item').first().click();

    const rows = page.getByTestId('message-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('Extinguisher check done on level 2.');
  });

  // A deleted message keeps its row so replies and reactions do not dangle.
  test('keeps a deleted message in place rather than dropping it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMessaging(page);

    await page.getByTestId('conversation-item').first().click();

    await expect(page.getByText('This message was deleted.')).toBeVisible();
  });

  test('sends a message and appends it to the thread', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { sent } = await landOnMessaging(page);

    await page.getByTestId('conversation-item').first().click();
    await page.getByTestId('message-composer').fill('On my way.');
    await page.getByTestId('message-send').click();

    await expect(page.getByTestId('message-row')).toHaveCount(3);
    await expect(page.getByText('On my way.')).toBeVisible();
    expect(sent).toEqual(['On my way.']);
  });

  test('refuses to send an empty draft', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { sent } = await landOnMessaging(page);

    await page.getByTestId('conversation-item').first().click();
    await page.getByTestId('message-composer').fill('   ');

    await expect(page.getByTestId('message-send').locator('button')).toBeDisabled();
    expect(sent).toEqual([]);
  });
});
