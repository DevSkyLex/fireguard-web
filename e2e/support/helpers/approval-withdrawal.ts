import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { approvalActionTypeOutput, approvalRequestOutput } from '../fixtures/approval-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { ApprovalsPage } from '../pages/approvals.page';
import { expectNoHorizontalOverflow } from './appearance';

/** Exercises requester withdrawal without approval permission and its recorded history. */
export async function verifyApprovalWithdrawal(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: ['organization.read', 'organization.approvals.read'],
  });
  const pending = approvalRequestOutput({
    allowedActions: ['withdraw'],
    decisionBlockReason: 'approval_permission_required',
    expiresAt: '2027-09-01T00:00:00Z',
  });
  await api.mockApprovalRequestList(E2E_ORGANIZATION_ID, [pending]);
  await api.mockApprovalActionTypes([approvalActionTypeOutput()]);
  let writes = 0;
  const note = 'Request duplicated during the site visit.';
  await page.route(new RegExp(`/approval-requests/${pending.id}/withdraw$`), async (route) => {
    writes++;
    expect(route.request().postDataJSON()).toEqual({ decisionNote: note });
    await route.fulfill({
      json: {
        ...pending,
        status: 'withdrawn',
        allowedActions: [],
        decisionBlockReason: 'approval_not_pending',
        decisionNote: note,
        decidedAt: '2026-09-21T12:00:00Z',
        decisionByMemberId: pending.requestedByMemberId,
      },
    });
  });
  const approvals = new ApprovalsPage(page);
  await approvals.goto(E2E_ORGANIZATION_ID);
  await expect(approvals.approve.filter({ visible: true })).toHaveCount(0);
  await page.getByTestId('approval-request-table-withdraw').filter({ visible: true }).click();
  await expect(approvals.decision).toContainText('without executing the action');
  await expect(approvals.decision.getByRole('alert')).toHaveCount(0);
  await approvals.note.fill(note);
  await page.screenshot({
    path: `e2e/artifacts/reliability/withdraw-${info.project.name.replaceAll(' ', '-').toLowerCase()}-dialog.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await approvals.confirm.focus();
  await page.keyboard.press('Enter');
  await expect(approvals.decision).toHaveCount(0);
  const row = page
    .getByTestId(
      info.project.name === 'chromium'
        ? 'approval-request-table-row'
        : 'approval-request-table-row-card',
    )
    .filter({ visible: true });
  await expect(row).toContainText('Withdrawn');
  await expect(row).toContainText(note);
  await expect(row).toContainText('Decided by');
  expect(writes).toBe(1);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `e2e/artifacts/reliability/withdraw-${info.project.name.replaceAll(' ', '-').toLowerCase()}-history.png`,
    fullPage: true,
    animations: 'disabled',
  });
}
