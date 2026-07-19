import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The unified inbox (`/account/inbox`).
 *
 * It lives under the account rather than an organization because an item's
 * `organizationId` is optional — this suite pins that an account-level item
 * still renders and simply does not navigate.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const item = (
  id: string,
  title: string,
  isRead: boolean,
  organizationId: string | null,
  targetType = 'intervention',
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
    const cursor: string | null = new URL(route.request().url()).searchParams.get('cursor');
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
                item('n3', 'Your password was changed', false, null, 'account'),
              ]
            : [item('n4', 'Older mention', true, organization.id)],
        nextCursor: cursor === null && hasMore ? 'cursor-2' : null,
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

    await expect(page.getByTestId('inbox-item')).toHaveCount(3);
    await expect(page.getByText('Nadia mentioned you')).toBeVisible();
    await expect(page.getByText('Your password was changed')).toBeVisible();
  });

  // Unread is a dot *and* a bold title — status is never colour-only.
  test('counts and filters unread entries', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnInbox(page);

    await expect(page.locator('#inbox')).toContainText('2');

    await page.getByTestId('unread-only').click();

    await expect(page.getByTestId('inbox-item')).toHaveCount(2);
    await expect(page.getByText('Report published')).toHaveCount(0);
  });

  // An account-level item has no organization to route into, so it must stay
  // put rather than navigate somewhere invented.
  test('leaves an account-level entry inert', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnInbox(page);

    await page.getByTestId('inbox-item').nth(2).click();

    await expect(page).toHaveURL(/\/account\/inbox/);
  });

  test('navigates to the record an organization entry points at', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnInbox(page);

    await page.getByTestId('inbox-item').first().click();

    await expect(page).toHaveURL(/\/interventions\/target-1/);
  });

  // The inbox is a feed, not a paged table: "load more" must append.
  test('appends the next page rather than replacing the feed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { cursors } = await landOnInbox(page, true);

    // p-button puts the testid on its host; the click handler is on the
    // inner button.
    await page.getByTestId('inbox-load-more').locator('button').click();

    await expect.poll(() => cursors).toEqual(['first', 'cursor-2']);
    await expect(page.getByTestId('inbox-item')).toHaveCount(4);
    await expect(page.getByText('Nadia mentioned you')).toBeVisible();
  });
});
