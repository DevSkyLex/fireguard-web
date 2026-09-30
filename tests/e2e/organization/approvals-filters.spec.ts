import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  approvalActionTypeOutput,
  approvalRequestOutput,
} from '../support/fixtures/approval-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { ApprovalsPage } from '../support/pages/approvals.page';

/**
 * A regression net for `app-collection-filter-bar` on the approvals inbox,
 * written against the page's current bespoke controls (a toggle-group for
 * "Status", an `app-collection-filter-select` for "Action type") so it
 * keeps passing once those controls are converted to the generic field
 * components — only the shared bar/chip chrome is asserted on, never an
 * internal control's own markup.
 *
 * `ApprovalsPage` seeds `status: 'pending'` by default, so the bar starts
 * expanded here unlike the other four filtered surfaces — the toggle is
 * exercised both ways (collapse, then re-expand) to prove the same
 * mechanism regardless of that starting point. There is no URL sync on this
 * page (`ApprovalsPage`/`AuditPage`/`ChecklistsPage`/`ImportsPage`/
 * `MaintenanceSchedulesPage` all keep their narrowing in component state,
 * never the query string), so the picked value is proven on the wire — the
 * outbound list request's own query parameter — rather than on
 * `page.url()`. The "Action type" chip's `[state]`/`(stateChanged)` wiring
 * opens its own value control the instant the field is picked from the
 * "+ Filter" menu (`CollectionFilterBar`'s `pendingKey` contract), the same
 * as every other converted collection page — so this spec picks the option
 * straight away rather than clicking the trigger first, which would toggle
 * the popover shut instead of opening it.
 */
test.describe('Approvals list — filter bar', () => {
  test('expands from the toolbar toggle, renders an editable "Action type" chip, narrows the request on a pick, and purges the param on removal', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockApprovalRequestList(E2E_ORGANIZATION_ID, [approvalRequestOutput()]);
    await api.mockApprovalActionTypes([approvalActionTypeOutput()]);
    const approvals = new ApprovalsPage(page);

    await approvals.goto(E2E_ORGANIZATION_ID);
    await expect(approvals.root).toBeVisible();

    await expect(approvals.filtersToggle).toHaveAttribute('aria-expanded', 'true');
    await approvals.filtersToggle.click();
    await expect(approvals.filtersToggle).toHaveAttribute('aria-expanded', 'false');
    await approvals.filtersToggle.click();
    await expect(approvals.filtersToggle).toHaveAttribute('aria-expanded', 'true');

    await approvals.addFilter('Action type');
    await expect(approvals.filterChip('Action type')).toBeVisible();

    const narrowedRequest = page.waitForRequest(
      (request) =>
        /\/api\/organizations\/.+\/approval-requests(\?.*)?$/.test(request.url()) &&
        new URL(request.url()).searchParams.has('actionType'),
    );
    await page.getByRole('option', { name: 'Non-conformity waiver' }).click();

    expect(new URL((await narrowedRequest).url()).searchParams.get('actionType')).toBe('nc_waiver');
    await expect(approvals.filterChip('Action type')).toContainText('Non-conformity waiver');

    const clearedRequest = page.waitForRequest((request) =>
      /\/api\/organizations\/.+\/approval-requests(\?.*)?$/.test(request.url()),
    );
    await approvals.removeFilterChip('Action type');

    expect(new URL((await clearedRequest).url()).searchParams.has('actionType')).toBe(false);
    await expect(approvals.filterChip('Action type')).toHaveCount(0);
  });
});
