import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The unified inbox (`/account/inbox`).
 *
 * It lives under the account rather than an organization because an item's
 * `organizationId` is optional — this suite pins how each of the two real
 * target types routes, with and without an organization.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

/**
 * The API emits exactly two `targetType` values — `notification` (the
 * Notification module) and `conversation` (Messaging mentions). Earlier
 * revisions of this fixture invented `intervention`, `facility` and `account`,
 * which is how the frontend came to route four target types that never arrive
 * while ignoring the dominant one.
 */
const item = (
  id: string,
  title: string,
  isRead: boolean,
  organizationId: string | null,
  targetType: 'notification' | 'conversation' = 'conversation',
) => ({
  sourceKey: 'notification',
  id,
  kind: 'mention',
  title,
  snippet: 'You were mentioned.',
  occurredAt: '2026-07-01T10:00:00+00:00',
  isRead,
  organizationId,
  targetType,
  targetId: 'target-1',
});

async function landOnInbox(page: Page, hasMore = false): Promise<{ cursors: string[] }> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  const cursors: string[] = [];

  await api.mockAuthenticatedSession({ organizations: [organization] });

  await page.route(`${API_BASE_URL}/api/inbox**`, (route) => {
    // `before` is the only pagination parameter the API reads; asserting on
    // `cursor` here is what let the frontend send the wrong name unnoticed.
    const cursor: string | null = new URL(route.request().url()).searchParams.get('before');
    cursors.push(cursor ?? 'first');

    return route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': '/api/inbox',
        '@type': 'Inbox',
        items:
          cursor === null
            ? [
                item('n1', 'Nadia mentioned you', false, organization.id),
                item('n2', 'Report published', true, organization.id),
                item('n3', 'Your password was changed', false, null, 'notification'),
                item('n5', 'Mention in a shared thread', false, null, 'conversation'),
              ]
            : [item('n4', 'Older mention', true, organization.id)],
        nextCursor: cursor === null && hasMore ? '2026-07-01T09:00:00+00:00' : null,
        hasMore: cursor === null && hasMore,
      }),
    });
  });

  await page.goto('/account/inbox');
  await expect(page.locator('#inbox')).toBeVisible();

  return { cursors };
}

test.describe('Unified inbox', () => {
  test('lists entries from every source and organization', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnInbox(page);

    await expect(page.getByTestId('inbox-item')).toHaveCount(4);
    await expect(page.getByText('Nadia mentioned you')).toBeVisible();
    await expect(page.getByText('Your password was changed')).toBeVisible();
  });

  // Unread is a dot *and* a bold title — status is never colour-only.
  test('counts and filters unread entries', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnInbox(page);

    await expect(page.locator('#inbox')).toContainText('3');

    await page.getByTestId('unread-only').click();

    await expect(page.getByTestId('inbox-item')).toHaveCount(3);
    await expect(page.getByText('Report published')).toHaveCount(0);
  });

  // A conversation lives inside an organization, so an entry without one has
  // nowhere to route: it must stay put rather than navigate somewhere invented.
  test('leaves an organization-less conversation entry inert', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnInbox(page);

    await page.getByTestId('inbox-item').nth(3).click();

    await expect(page).toHaveURL(/\/account\/inbox/);
  });

  // A notification is account-level by nature — it routes even with no
  // organization, which is why it must not be treated as inert.
  test('opens the account notification list for a notification entry', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnInbox(page);

    await page.getByTestId('inbox-item').nth(2).click();

    await expect(page).toHaveURL(/\/account\?tab=notifications/);
  });

  // The workspace opens a thread through `?conversation=`; `/messages/<id>` is
  // not a route, so a path segment would land on a blank page.
  test('opens the conversation an organization entry points at', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnInbox(page);

    await page.getByTestId('inbox-item').first().click();

    await expect(page).toHaveURL(/\/messages\?conversation=target-1/);
  });

  // The inbox is a feed, not a paged table: "load more" must append.
  test('appends the next page rather than replacing the feed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { cursors } = await landOnInbox(page, true);

    // p-button puts the testid on its host; the click handler is on the
    // inner button.
    await page.getByTestId('inbox-load-more').locator('button').click();

    await expect.poll(() => cursors).toEqual(['first', '2026-07-01T09:00:00+00:00']);
    await expect(page.getByTestId('inbox-item')).toHaveCount(5);
    await expect(page.getByText('Nadia mentioned you')).toBeVisible();
  });
});
