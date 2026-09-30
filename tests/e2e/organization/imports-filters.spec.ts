import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { importJobOutput } from '../support/fixtures/import-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { ImportsPage } from '../support/pages/imports.page';

/**
 * A regression net for `app-collection-filter-bar` on the bulk CSV import
 * surface, written against the page's current bespoke "Kind" `hlm-select` so
 * it keeps passing once that control is converted to the generic field
 * components — only the shared bar/chip chrome is asserted on, never the
 * select's own internal markup.
 *
 * `ImportsPage` keeps its narrowing in component state, never the query
 * string (its own class doc says so explicitly), so the picked value is
 * proven on the wire — the outbound list request's own query parameter —
 * rather than on `page.url()`. The "Kind" chip's `[state]`/`(stateChanged)`
 * wiring opens its own `hlm-select` the instant the field is picked from
 * the "+ Filter" menu (`CollectionFilterBar`'s `pendingKey` contract), so
 * this spec picks the option straight away rather than clicking the
 * trigger first — an extra click there would toggle the popover shut.
 */
test.describe('Imports list — filter bar', () => {
  test('expands from the toolbar toggle, renders an editable "Kind" chip, narrows the request on a pick, and purges the param on removal', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockImportJobList([importJobOutput()]);
    const imports = new ImportsPage(page);

    await imports.goto(E2E_ORGANIZATION_ID);
    await expect(imports.root).toBeVisible();

    await expect(imports.filtersToggle).toHaveAttribute('aria-expanded', 'false');
    await imports.openFilters();
    await expect(imports.filtersToggle).toHaveAttribute('aria-expanded', 'true');

    await imports.addFilter('Kind');
    await expect(imports.filterChip('Kind')).toBeVisible();

    const narrowedRequest = page.waitForRequest(
      (request) =>
        /\/api\/imports(\?.*)?$/.test(request.url()) &&
        new URL(request.url()).searchParams.has('kind'),
    );
    await page.getByRole('option', { name: 'Equipment' }).click();

    expect(new URL((await narrowedRequest).url()).searchParams.get('kind')).toBe('equipment');
    await expect(imports.filterChip('Kind')).toContainText('Equipment');

    const clearedRequest = page.waitForRequest((request) =>
      /\/api\/imports(\?.*)?$/.test(request.url()),
    );
    await imports.removeFilterChip('Kind');

    expect(new URL((await clearedRequest).url()).searchParams.has('kind')).toBe(false);
    await expect(imports.filterChip('Kind')).toHaveCount(0);
  });
});
