import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { verifyApprovalWithdrawal } from '../support/helpers/approval-withdrawal';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';

test('requester withdraws on mobile and sees the recorded history', async ({
  page,
  context,
  baseURL,
}, info) => {
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyApprovalWithdrawal(page, info);
});
