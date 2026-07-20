import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The conversation details panel — the shell's right-hand region.
 *
 * This is the app's first `PANEL_SLOT` contribution, so the suite pins the
 * plumbing as much as the content: a routed page opens a layout-owned panel
 * through `SHELL_PANEL_PORT`, and the panel resolves its own data from the URL
 * rather than from the page's store.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const conversation = (id: string, name: string | null, extra: Record<string, unknown> = {}) => ({
  '@id': `/api/conversations/${id}`,
  '@type': 'Conversation',
  id,
  organization: '/api/organizations/e2e-org-1',
  subjectType: 'channel',
  subject: null,
  subjectLabel: name,
  visibility: 'public',
  lastMessageAt: null,
  messagesCount: 12,
  isArchived: false,
  unreadCount: 0,
  createdAt: '2026-05-04T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  isChannel: true,
  name,
  team: null,
  isFavorite: false,
  parentConversationId: null,
  ...extra,
});

const message = (id: string, body: string | null, extra: Record<string, unknown> = {}) => ({
  '@id': `/api/messages/${id}`,
  '@type': 'Message',
  id,
  conversation: '/api/conversations/general',
  authorMember: 'member-abc',
  body,
  mentions: [],
  editedAt: null,
  isDeleted: false,
  deletedAt: null,
  attachments: [],
  pinnedAt: '2026-07-01T10:00:00Z',
  pinnedBy: 'member-abc',
  reactions: [],
  isSaved: false,
  replyCount: 0,
  createdAt: '2026-07-01T10:00:00Z',
  updatedAt: '2026-07-01T10:00:00Z',
  ...extra,
});

async function landOnConversation(page: Page): Promise<string> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
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
            joinedAt: '2026-01-01T00:00:00Z',
            roleIds: [],
          },
        ],
        totalItems: 1,
      }),
    }),
  );

  // Broad catch-all FIRST: Playwright matches handlers in reverse registration
  // order, so the specific routes below win.
  await page.route(`${API_BASE_URL}/api/conversations/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({ member: [], totalItems: 0 }),
    }),
  );

  await page.route(`${API_BASE_URL}/api/conversations?**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({ member: [conversation('general', 'general')], totalItems: 1 }),
    }),
  );

  await page.route(`${API_BASE_URL}/api/conversations/general/pinned-messages**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [message('p1', 'Checklists are due Friday — do not slip.')],
        totalItems: 1,
      }),
    }),
  );

  await page.route(`${API_BASE_URL}/api/conversations/general/attachments**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          {
            '@id': '/api/messaging-attachments/att-1',
            '@type': 'MessagingAttachment',
            id: 'att-1',
            message: 'p1',
            conversation: 'general',
            uploadedByMember: 'member-abc',
            fileName: 'inspection-report.pdf',
            mimeType: 'application/pdf',
            size: 245760,
            label: null,
            revision: 1,
            uploadedAt: '2026-07-01T10:00:00Z',
          },
        ],
        totalItems: 1,
      }),
    }),
  );

  await page.route(`${API_BASE_URL}/api/channels/general/participants**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          {
            '@id': '/api/channels/general/participants/member-abc',
            '@type': 'ChannelParticipant',
            memberId: 'member-abc',
            role: 'Operations lead',
            source: 'direct',
            addedAt: '2026-05-04T00:00:00Z',
          },
          {
            '@id': '/api/channels/general/participants/member-team',
            '@type': 'ChannelParticipant',
            memberId: 'member-team',
            role: null,
            source: 'team',
            addedAt: '2026-05-06T00:00:00Z',
          },
        ],
        totalItems: 2,
      }),
    }),
  );

  await page.goto(`/organizations/${organization.id}/messages?conversation=general`);
  await expect(page.getByTestId('conversation-details-toggle')).toBeVisible();

  return organization.id;
}

test.describe('Conversation details panel', () => {
  test('opens from the conversation header and closes again', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await landOnConversation(page);

    const panel = page.getByTestId('conversation-details-panel');
    await expect(panel).toHaveCount(0);

    await page.getByTestId('conversation-details-toggle').locator('button').click();
    await expect(panel).toBeVisible();

    await page.getByTestId('conversation-details-toggle').locator('button').click();
    await expect(panel).toHaveCount(0);
  });

  test('shows main info and the channel members, flagging team-sourced ones', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await landOnConversation(page);
    await page.getByTestId('conversation-details-toggle').locator('button').click();

    await expect(page.getByTestId('details-message-count')).toHaveText('12');
    await expect(page.getByTestId('details-member-count')).toHaveText('2');

    const members = page.getByTestId('details-member');
    await expect(members).toHaveCount(2);
    // Directly-added members sort before team-sourced ones.
    await expect(members.first()).toContainText('Nadia Rahal');
    await expect(members.first()).toContainText('Operations lead');
    await expect(members.nth(1)).toContainText('Team');
  });

  test('lists the conversation pins', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await landOnConversation(page);
    await page.getByTestId('conversation-details-toggle').locator('button').click();
    await page.getByTestId('details-tab-pins').click();

    await expect(page.getByTestId('details-pin')).toContainText(
      'Checklists are due Friday — do not slip.',
    );
  });

  test('lists every file with a download link', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await landOnConversation(page);
    await page.getByTestId('conversation-details-toggle').locator('button').click();
    await page.getByTestId('details-tab-files').click();

    const file = page.getByTestId('details-file');
    await expect(file).toContainText('inspection-report.pdf');
    await expect(file).toContainText('240 KB');
    await expect(file).toHaveAttribute('href', /\/api\/messaging-attachments\/att-1\/content$/);
  });

  test('does not push the workspace sideways when open', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await landOnConversation(page);
    await page.getByTestId('conversation-details-toggle').locator('button').click();
    await expect(page.getByTestId('conversation-details-panel')).toBeVisible();

    const overflows = await page.evaluate(
      (): boolean => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});
