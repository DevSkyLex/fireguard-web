import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { verifyFailedMessages } from '../support/helpers/failed-messages';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
test('opens and retries failed sends on mobile', async ({ page, context, baseURL }, info) => {
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyFailedMessages(page, info);
});
