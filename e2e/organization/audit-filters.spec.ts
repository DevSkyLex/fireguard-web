import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { auditEventOutput } from '../support/fixtures/audit-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { AuditPage } from '../support/pages/audit.page';

/**
 * A regression net for `app-collection-filter-bar` on the audit journal,
 * written against the page's own bespoke "Action" `hlm-combobox` — kept
 * hand-rolled by design (its options are grouped by module, a shape
 * `CollectionFilterSelect` cannot render, and it is the sole consumer of
 * that shape) — so only the shared bar/chip chrome and the `state`/
 * `stateChanged` open-on-pick contract are asserted on, never the
 * combobox's own internal markup.
 *
 * `AuditPage` keeps its narrowing in component state, never the query
 * string, so the picked value is proven on the wire — the outbound list
 * request's own query parameter — rather than on `page.url()`.
 */
test.describe('Audit journal — filter bar', () => {
  test('expands from the toolbar toggle, renders an editable "Action" chip, narrows the request on a pick, and purges the param on removal', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockAuditEventList(E2E_ORGANIZATION_ID, [auditEventOutput()]);
    const audit = new AuditPage(page);

    await audit.goto(E2E_ORGANIZATION_ID);
    await expect(audit.root).toBeVisible();

    await expect(audit.filtersToggle).toHaveAttribute('aria-expanded', 'false');
    await audit.openFilters();
    await expect(audit.filtersToggle).toHaveAttribute('aria-expanded', 'true');

    await audit.addFilter('Action');
    await expect(audit.filterChip('Action')).toBeVisible();

    const narrowedRequest = page.waitForRequest(
      (request) =>
        /\/api\/organizations\/.+\/audit-events(\?.*)?$/.test(request.url()) &&
        new URL(request.url()).searchParams.has('action'),
    );
    await page.getByRole('option', { name: 'Organization created' }).click();

    expect(new URL((await narrowedRequest).url()).searchParams.get('action')).toBe(
      'organization.created',
    );
    await expect(audit.actionFilter).toHaveValue('Organization created');

    const clearedRequest = page.waitForRequest((request) =>
      /\/api\/organizations\/.+\/audit-events(\?.*)?$/.test(request.url()),
    );
    await audit.removeFilterChip('Action');

    expect(new URL((await clearedRequest).url()).searchParams.has('action')).toBe(false);
    await expect(audit.filterChip('Action')).toHaveCount(0);
  });
});
