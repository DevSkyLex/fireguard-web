import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The organization calendar (`/calendar`) — the merged feed on one grid.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

/** Mid-month so the entries land in the focused month whatever day it runs. */
const anchor = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 15, 9, 0, 0).toISOString();
};

const item = (sourceKey: string, id: string, title: string) => ({
  sourceKey,
  id,
  title,
  description: null,
  startsAt: anchor(),
  endsAt: null,
  allDay: false,
  facilityId: null,
  status: 'planned',
  targetType: sourceKey,
  targetId: `${id}-target`,
});

async function landOnCalendar(page: Page): Promise<{ windows: string[] }> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  const windows: string[] = [];

  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  await page.route(
    `${API_BASE_URL}/api/organizations/${organization.id}/calendar/feed**`,
    (route) => {
      windows.push(new URL(route.request().url()).searchParams.get('from') ?? '');
      return route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@id': '/api/organizations/org/calendar/feed',
          '@type': 'CalendarFeed',
          from: anchor(),
          to: anchor(),
          items: [
            item('intervention', 'i1', 'Quarterly extinguisher round'),
            item('inspection', 'n1', 'Annual fire door inspection'),
            item('maintenance', 'm1', 'Sprinkler servicing'),
            item('calendar_event', 'e1', 'Site safety briefing'),
          ],
        }),
      });
    },
  );

  await page.goto(`/organizations/${organization.id}/calendar`);
  await expect(page.locator('#calendar')).toBeVisible();

  return { windows };
}

test.describe('Organization calendar', () => {
  test('shows entries from every source on one grid', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnCalendar(page);

    const calendar = page.locator('app-calendar');

    await expect(calendar).toContainText('Quarterly extinguisher round');
    await expect(calendar).toContainText('Annual fire door inspection');
    await expect(calendar).toContainText('Sprinkler servicing');

    // A month cell caps at three entries and folds the rest behind a counter —
    // the fourth is present, not dropped.
    await expect(calendar).toContainText('+1 more');
  });

  // The backend has no "Audit" source; offering the filter would imply data is
  // missing rather than absent by design.
  test('offers exactly the four real sources as filters', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnCalendar(page);

    const calendar = page.locator('app-calendar');

    await expect(calendar).toContainText('Interventions');
    await expect(calendar).toContainText('Inspections');
    await expect(calendar).toContainText('Maintenance');
    await expect(calendar).toContainText('Events');
    await expect(calendar).not.toContainText('Audit');
  });

  test('requests a window rather than the whole year', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { windows } = await landOnCalendar(page);

    await expect.poll(() => windows.length).toBeGreaterThan(0);

    const from = new Date(windows[0] ?? '');
    const now = new Date();
    const monthsApart: number =
      (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());

    expect(monthsApart).toBe(1);
  });

  test('does not push the page sideways', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await landOnCalendar(page);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(overflows).toBe(false);
  });

  // The switch offered Month / Week / Agenda. The day view was implemented end
  // to end — its own template branch, navigation step and label — and simply
  // left out of the default view list, so nothing could reach it.
  test('offers the day view and opens it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await landOnCalendar(page);

    const dayOption = page.getByRole('button', { name: 'Day', exact: true });
    await expect(dayOption).toBeVisible();

    await dayOption.click();

    // The day grid replaces the month cells.
    await expect(page.locator('app-calendar-week')).toBeVisible();
  });

  // The colour bar encodes the kind and nothing else; PRODUCT.md forbids status
  // carried by colour alone.
  test('names the kind of each event, not just its colour', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await landOnCalendar(page);

    // The agenda lists the whole period, so all four sources are on screen at
    // once; the day column only holds the focused date.
    await page.getByRole('button', { name: 'Agenda', exact: true }).click();

    const labels = page.getByTestId('calendar-event-type');
    await expect(labels).toHaveCount(4);
    await expect(labels.filter({ hasText: 'Inspection' })).toHaveCount(1);
    await expect(labels.filter({ hasText: 'Maintenance' })).toHaveCount(1);
  });
});
