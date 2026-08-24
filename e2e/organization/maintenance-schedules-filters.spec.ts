import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { maintenanceScheduleOutput } from '../support/fixtures/maintenance-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { MaintenanceSchedulesPage } from '../support/pages/maintenance-schedules.page';

/**
 * A regression net for `app-collection-filter-bar` on the maintenance
 * schedule board, written against the page's current bespoke "Due status"
 * `hlm-select` so it keeps passing once that control is converted to the
 * generic field components — only the shared bar/chip chrome is asserted
 * on, never the select's own internal markup.
 *
 * `MaintenanceSchedulesPage` keeps its narrowing in component state, never
 * the query string, so the picked value is proven on the wire — the
 * outbound list request's own query parameter — rather than on
 * `page.url()`. The "Due status" chip's `[state]`/`(stateChanged)` wiring
 * opens its own `hlm-select` the instant the field is picked from the
 * "+ Filter" menu (`CollectionFilterBar`'s `pendingKey` contract), so this
 * spec picks the option straight away rather than clicking the trigger
 * first — an extra click there would toggle the popover shut. The page
 * also always fetches the facility scoping options on init, mocked here to
 * an empty collection since this spec never opens the "Facility" field.
 */
test.describe('Maintenance schedules — filter bar', () => {
  test('expands from the toolbar toggle, renders an editable "Due status" chip, narrows the request on a pick, and purges the param on removal', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockMaintenanceScheduleList([maintenanceScheduleOutput()]);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    const maintenance = new MaintenanceSchedulesPage(page);

    await maintenance.goto(E2E_ORGANIZATION_ID);
    await expect(maintenance.root).toBeVisible();

    await expect(maintenance.filtersToggle).toHaveAttribute('aria-expanded', 'false');
    await maintenance.openFilters();
    await expect(maintenance.filtersToggle).toHaveAttribute('aria-expanded', 'true');

    await maintenance.addFilter('Due status');
    await expect(maintenance.filterChip('Due status')).toBeVisible();

    const narrowedRequest = page.waitForRequest(
      (request) =>
        /\/api\/maintenance\/schedules(\?.*)?$/.test(request.url()) &&
        new URL(request.url()).searchParams.has('dueStatus'),
    );
    await page.getByRole('option', { name: 'Overdue' }).click();

    expect(new URL((await narrowedRequest).url()).searchParams.get('dueStatus')).toBe('overdue');
    await expect(maintenance.filterChip('Due status')).toContainText('Overdue');

    const clearedRequest = page.waitForRequest((request) =>
      /\/api\/maintenance\/schedules(\?.*)?$/.test(request.url()),
    );
    await maintenance.removeFilterChip('Due status');

    expect(new URL((await clearedRequest).url()).searchParams.has('dueStatus')).toBe(false);
    await expect(maintenance.filterChip('Due status')).toHaveCount(0);
  });
});
