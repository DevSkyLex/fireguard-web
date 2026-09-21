import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { verifyApprovalConflict } from '../support/helpers/approval-conflict';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';

test('retains the decision note on mobile after a competing decision', async ({
  page,
  context,
  baseURL,
}, info) => {
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyApprovalConflict(page, info);
});
