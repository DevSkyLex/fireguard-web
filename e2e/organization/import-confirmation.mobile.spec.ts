import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { verifyImportConfirmation } from '../support/helpers/import-confirmation';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';

test('confirms the retained simulation on mobile', async ({ page, context, baseURL }, info) => {
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyImportConfirmation(page, info);
});
