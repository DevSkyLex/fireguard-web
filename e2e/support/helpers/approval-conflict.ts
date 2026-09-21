import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { approvalActionTypeOutput, approvalRequestOutput } from '../fixtures/approval-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { ApprovalsPage } from '../pages/approvals.page';
import { expectNoHorizontalOverflow } from './appearance';

/** Keeps the user's decision context across a competing decision and observation failure. */
export async function verifyApprovalConflict(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const pending = approvalRequestOutput({
    allowedActions: ['approve', 'reject'],
    expiresAt: '2027-09-01T00:00:00Z',
  });
  await api.mockApprovalRequestList(E2E_ORGANIZATION_ID, [pending]);
  await api.mockApprovalActionTypes([approvalActionTypeOutput()]);
  let reads = 0;
  const path = `/api/organizations/${E2E_ORGANIZATION_ID}/approval-requests/${pending.id}`;
  await page.route(new RegExp(`${path}$`), async (route) => {
    reads++;
    await route.fulfill(
      reads === 1
        ? {
            status: 500,
            json: { status: 500, detail: 'The latest state is temporarily unavailable.' },
          }
        : {
            json: {
              ...pending,
              status: 'rejected',
              allowedActions: [],
              decisionBlockReason: 'approval_not_pending',
            },
          },
    );
  });
  await page.route(new RegExp(`${path}/approve$`), (route) =>
    route.fulfill({
      status: 409,
      json: {
        status: 409,
        type: '/errors/approval_not_pending',
        title: 'Conflict',
        code: 'approval_not_pending',
        detail: 'La décision a déjà été prise.',
      },
    }),
  );
  const approvals = new ApprovalsPage(page);
  await approvals.goto(E2E_ORGANIZATION_ID);
  await approvals.approve.filter({ visible: true }).first().click();
  await approvals.note.fill('Evidence reviewed on site; retain this draft.');
  if (info.project.name === 'chromium') {
    await approvals.confirm.focus();
    await page.keyboard.press('Enter');
  } else {
    await approvals.confirm.click();
  }
  await expect(approvals.decision).toContainText('already decided');
  await expect(approvals.decision).toContainText('temporarily unavailable');
  await expect(approvals.note).toHaveValue('Evidence reviewed on site; retain this draft.');
  await approvals.refreshDecision.click();
  await expect(approvals.confirm).toBeDisabled();
  await expect(approvals.note).toHaveValue('Evidence reviewed on site; retain this draft.');
  expect(reads).toBe(2);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `e2e/artifacts/reliability/approval-${info.project.name.replaceAll(' ', '-').toLowerCase()}-conflict.png`,
    fullPage: true,
    animations: 'disabled',
  });
}
