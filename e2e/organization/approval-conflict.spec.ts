import { test } from '@playwright/test';
import { verifyApprovalConflict } from '../support/helpers/approval-conflict';

test('retains the decision note after conflict and a failed refresh', async ({ page }, info) => {
  await verifyApprovalConflict(page, info);
});
