import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The messaging workspace's two satellite views — Saved items and Drafts —
 * plus the draft-persistence invariant of the workspace itself: a half-typed
 * message survives switching conversations and reloading, per conversation.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const conversation = (id: string, name: string | null, extra: Record<string, unknown> = {}) => ({
  '@id': `/api/conversations/${id}`,
  '@type': 'Conversation',
  id,
  organization: '/api/organizations/e2e-org-1',
  subjectType: 'channel',
  subject: null,
  subjectLabel: null,
  visibility: 'public',
  lastMessageAt: null,
  messagesCount: 0,
  isArchived: false,
  unreadCount: 0,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  isChannel: true,
  name,
  team: null,
  isFavorite: false,
  parentConversationId: null,
  ...extra,
});

const savedMessage = (id: string, body: string | null, isDeleted: boolean = false) => ({
  '@id': `/api/messages/${id}`,
  '@type': 'Message',
  id,
  conversation: '/api/conversations/general',
  // A member IRI, as the API sends it — a bare id here would re-validate the
  // contract the frontend used to imagine instead of the real one.
  authorMember: '/api/organizations/e2e-org-1/members/member-abc',
  body,
  mentions: [],
  editedAt: null,
  isDeleted,
  deletedAt: isDeleted ? '2026-07-02T00:00:00Z' : null,
  attachments: [],
  pinnedAt: null,
  pinnedBy: null,
  reactions: [],
  isSaved: true,
  replyCount: 0,
  createdAt: '2026-07-01T10:00:00Z',
  updatedAt: '2026-07-01T10:00:00Z',
});

async function mockWorkspace(page: Page): Promise<string> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

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
            displayName: 'Amélie Rivet',
            email: 'amelie@example.test',
          },
        ],
        totalItems: 1,
      }),
    }),
  );

  // Broad messaging catch-all FIRST: Playwright matches routes in reverse
  // registration order, so the specific handlers below win.
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
      body: JSON.stringify({
        member: [conversation('general', 'general'), conversation('incidents', 'incidents')],
        totalItems: 2,
      }),
    }),
  );

  await page.route(`${API_BASE_URL}/api/saved-messages**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          savedMessage('m1', 'The extinguisher report is ready for review.'),
          savedMessage('m2', null, true),
        ],
        totalItems: 2,
      }),
    }),
  );

  return organization.id;
}

test.describe('Saved items', () => {
  test('lists saved messages with author, deleted placeholder and unsave', async ({ page }) => {
    const organizationId = await mockWorkspace(page);

    let unsaved = false;
    await page.route(`${API_BASE_URL}/api/messages/m1/save`, (route) => {
      unsaved = route.request().method() === 'DELETE';
      return route.fulfill({ status: 204, body: '' });
    });

    await page.goto(`/organizations/${organizationId}/messages/saved`);

    const rows = page.locator('[data-testid="saved-message-row"]');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('Amélie Rivet');
    await expect(rows.first()).toContainText('The extinguisher report is ready for review.');
    // The deleted message keeps its row — the bookmark is the member's.
    await expect(rows.nth(1)).toContainText('This message was deleted.');

    await rows.first().locator('[data-testid="saved-message-unsave"] button').click();
    await expect(rows).toHaveCount(1);
    expect(unsaved).toBe(true);
  });

  test('jumps into the message conversation', async ({ page }) => {
    const organizationId = await mockWorkspace(page);
    await page.goto(`/organizations/${organizationId}/messages/saved`);

    await page
      .locator('[data-testid="saved-message-row"]')
      .first()
      .locator('[data-testid="saved-message-open"] button')
      .click();

    await expect(page).toHaveURL(new RegExp(`/messages\\?conversation=general$`));
  });
});

test.describe('Drafts', () => {
  test('lists stored drafts and discards in place', async ({ page }) => {
    const organizationId = await mockWorkspace(page);

    await page.addInitScript(
      ([orgId]) => {
        localStorage.setItem(`fg.msg.draft.${orgId}.general`, 'Still need to check the RIA line');
      },
      [organizationId],
    );

    await page.goto(`/organizations/${organizationId}/messages/drafts`);

    const row = page.locator('[data-testid="draft-row"]');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('general');
    await expect(page.locator('[data-testid="draft-excerpt"]')).toContainText(
      'Still need to check the RIA line',
    );

    await row.locator('[data-testid="draft-discard"] button').click();
    await expect(row).toHaveCount(0);

    const stored = await page.evaluate(
      ([orgId]) => localStorage.getItem(`fg.msg.draft.${orgId}.general`),
      [organizationId],
    );
    expect(stored).toBeNull();
  });
});

test.describe('Draft persistence', () => {
  test('a half-typed draft survives switching conversations', async ({ page }) => {
    const organizationId = await mockWorkspace(page);
    await page.goto(`/organizations/${organizationId}/messages?conversation=general`);

    const composer = page.locator('#messaging-composer textarea, textarea').first();
    await composer.fill('Draft for general, not sent yet');

    // Switching persists immediately (no debounce wait needed) and restores
    // the other conversation's own (empty) draft.
    await page.locator('[data-conversation-id="incidents"]').click();
    await expect(composer).toHaveValue('');

    await page.locator('[data-conversation-id="general"]').click();
    await expect(composer).toHaveValue('Draft for general, not sent yet');
  });
});
