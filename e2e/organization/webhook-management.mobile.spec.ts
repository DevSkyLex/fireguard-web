import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { verifyWebhookManagement } from '../support/helpers/webhook-management';
test('manages webhooks on mobile in dark mode', async ({ page, context, baseURL }, info) => {
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyWebhookManagement(page, info);
});
