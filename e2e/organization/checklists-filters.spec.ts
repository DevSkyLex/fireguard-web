import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { expectSheetGuardHolds } from '../support/helpers/sheet-guard';
import { ApiMock } from '../support/mocks/api-mock';
import { ChecklistsPage } from '../support/pages/checklists.page';

/**
 * A regression net for `app-collection-filter-bar` on the checklist template
 * library, written against the page's current bespoke "Status"
 * `hlm-toggle-group` so it keeps passing once that control is converted to
 * the generic field components — only the shared bar/chip chrome is
 * asserted on, never the toggle-group's own internal markup.
 *
 * `ChecklistsPage` keeps its narrowing in component state, never the query
 * string, so the picked value is proven on the wire — the outbound list
 * request's own query parameter — rather than on `page.url()`.
 */
test.describe('Checklists list — filter bar', () => {
  test('expands from the toolbar toggle, renders an editable "Status" chip, narrows the request on a pick, and purges the param on removal', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChecklistList(E2E_ORGANIZATION_ID, []);
    const checklists = new ChecklistsPage(page);

    await checklists.goto(E2E_ORGANIZATION_ID);
    await expect(checklists.root).toBeVisible();

    await expect(checklists.filtersToggle).toHaveAttribute('aria-expanded', 'false');
    await checklists.openFilters();
    await expect(checklists.filtersToggle).toHaveAttribute('aria-expanded', 'true');

    await checklists.addFilter('Status');
    await expect(checklists.filterChip('Status')).toBeVisible();

    const narrowedRequest = page.waitForRequest(
      (request) =>
        /\/api\/organizations\/.+\/checklists(\?.*)?$/.test(request.url()) &&
        new URL(request.url()).searchParams.has('status'),
    );
    await checklists.statusFilter.getByRole('button', { name: 'Active' }).click();

    expect(new URL((await narrowedRequest).url()).searchParams.get('status')).toBe('active');
    await expect(checklists.filterChip('Status')).toContainText('Active');

    const clearedRequest = page.waitForRequest((request) =>
      /\/api\/organizations\/.+\/checklists(\?.*)?$/.test(request.url()),
    );
    await checklists.removeFilterChip('Status');

    expect(new URL((await clearedRequest).url()).searchParams.has('status')).toBe(false);
    await expect(checklists.filterChip('Status')).toHaveCount(0);
  });
});

test.describe('Checklists list — create sheet', () => {
  test('opens its sheet from the header button and guards a dirty draft', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChecklistList(E2E_ORGANIZATION_ID, []);
    const checklists = new ChecklistsPage(page);

    await checklists.goto(E2E_ORGANIZATION_ID);
    await expect(checklists.createRoot).toBeHidden();

    await checklists.newButton.click();
    await expect(checklists.createRoot).toBeVisible();

    await checklists.createName.click();
    await checklists.createName.pressSequentially('Fire Safety Inspection');

    await expectSheetGuardHolds(page, checklists.createRoot, () => page.keyboard.press('Escape'));
  });
});
