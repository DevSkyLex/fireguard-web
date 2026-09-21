import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { verifyMembershipTransitions } from '../support/helpers/membership-transitions';
test('refreshes memberships on mobile in dark mode', async ({ page, context, baseURL }, info) => {
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyMembershipTransitions(page, info);
});
