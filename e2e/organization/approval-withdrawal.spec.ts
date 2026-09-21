import { test } from '@playwright/test';
import { verifyApprovalWithdrawal } from '../support/helpers/approval-withdrawal';

test('requester withdraws and sees the recorded history', async ({ page }, info) => {
  await verifyApprovalWithdrawal(page, info);
});
