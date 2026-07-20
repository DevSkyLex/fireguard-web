import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The message row: mention rendering, the "You" badge and the floating action
 * card with its quick-reaction picker.
 */
const API = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';
const ME = 'member-abc';
const OTHER = '550e8400-e29b-41d4-a716-446655440000';

const message = (id: string, body: string, author: string, at: string) => ({
  '@id': `/api/messages/${id}`,
  '@type': 'Message',
  id,
  conversation: '/api/conversations/general',
  authorMember: `/api/organizations/e2e-org-1/members/${author}`,
  body,
  mentions: [],
  editedAt: null,
  isDeleted: false,
  deletedAt: null,
  attachments: [],
  pinnedAt: null,
  pinnedBy: null,
  reactions: [],
  isSaved: false,
  replyCount: 0,
  createdAt: at,
  updatedAt: at,
});

async function land(page: Page): Promise<{ reacted: string[] }> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  const reacted: string[] = [];

  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id, { id: ME });

  await page.route(`${API}/api/organizations/${organization.id}/members**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          {
            '@id': `/api/members/${ME}`,
            '@type': 'OrganizationMember',
            id: ME,
            organizationId: organization.id,
            userId: 'u1',
            email: 'n@f.t',
            firstName: 'Nadia',
            lastName: 'Rahal',
            avatarUrl: null,
            isActive: true,
            joinedAt: '2026-01-01T00:00:00Z',
            roleIds: [],
          },
          {
            '@id': `/api/members/${OTHER}`,
            '@type': 'OrganizationMember',
            id: OTHER,
            organizationId: organization.id,
            userId: 'u2',
            email: 'b@f.t',
            firstName: 'Bruno',
            lastName: 'Cole',
            avatarUrl: null,
            isActive: true,
            joinedAt: '2026-01-01T00:00:00Z',
            roleIds: [],
          },
        ],
        totalItems: 2,
      }),
    }),
  );

  await page.route(`${API}/api/messages/**`, async (route) => {
    reacted.push(
      `${route.request().method()} ${route.request().url().split('/messages/')[1] ?? ''}`,
    );
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route(`${API}/api/conversations/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({ member: [], totalItems: 0 }),
    }),
  );
  await page.route(`${API}/api/conversations?**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          {
            '@id': '/api/conversations/general',
            '@type': 'Conversation',
            id: 'general',
            organization: '/api/organizations/e2e-org-1',
            subjectType: 'channel',
            subject: null,
            subjectLabel: 'general',
            visibility: 'public',
            lastMessageAt: null,
            messagesCount: 2,
            isArchived: false,
            unreadCount: 0,
            createdAt: '2026-05-04T00:00:00Z',
            updatedAt: '2026-07-01T00:00:00Z',
            isChannel: true,
            name: 'general',
            team: null,
            isFavorite: false,
            parentConversationId: null,
          },
        ],
        totalItems: 1,
      }),
    }),
  );
  await page.route(`${API}/api/conversations/general/messages**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          message('m1', `Can you confirm, @{${OTHER}}?`, ME, '2026-07-01T10:00:00Z'),
          message('m2', 'On it.', OTHER, '2026-07-01T10:02:00Z'),
        ],
        totalItems: 2,
      }),
    }),
  );

  await page.goto(`/organizations/${organization.id}/messages?conversation=general`);
  await expect(page.getByTestId('message-row').first()).toBeVisible();

  return { reacted };
}

test.describe('Message row', () => {
  // The body stores `@{uuid}`; printing it raw showed a UUID mid-sentence.
  test('renders a mention as the member name, never the raw token', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await land(page);

    const mention = page.getByTestId('message-mention');
    await expect(mention).toHaveText('@Bruno Cole');
    await expect(page.getByTestId('message-row').first()).not.toContainText(OTHER);
  });

  test('badges only the reader own message', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await land(page);

    const rows = page.getByTestId('message-row');
    await expect(rows.first().getByTestId('message-you-badge')).toBeVisible();
    await expect(rows.nth(1).getByTestId('message-you-badge')).toHaveCount(0);
  });

  test('offers quick reactions from the row action card', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { reacted } = await land(page);

    const row = page.getByTestId('message-row').first();
    await row.hover();
    await expect(page.getByTestId('reaction-picker')).toHaveCount(0);

    await row.getByTestId('react-toggle').click();
    const picker = page.getByTestId('reaction-picker');
    await expect(picker).toBeVisible();
    await expect(picker.getByTestId('quick-reaction')).toHaveCount(8);

    await picker.getByTestId('quick-reaction').first().click();
    // Picking closes the picker, otherwise it hides the chip just added.
    await expect(picker).toHaveCount(0);
    expect(reacted.some((call) => call.startsWith('POST m1/reactions'))).toBe(true);
  });

  test('exposes reply and pin alongside save in the action card', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await land(page);

    const row = page.getByTestId('message-row').first();
    await row.hover();

    await expect(row.getByTestId('reply-action')).toBeVisible();
    await expect(row.getByTestId('save-toggle')).toBeVisible();
    await expect(row.getByTestId('pin-toggle')).toBeVisible();
  });
});
