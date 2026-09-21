import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { verifyImportResumption } from '../support/helpers/import-resumption';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';

test('resumes an import in the dark mobile report sheet', async ({
  page,
  context,
  baseURL,
}, info) => {
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyImportResumption(page, info);
});
