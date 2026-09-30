import { test } from '@playwright/test';
import { verifyImportConfirmation } from '../support/helpers/import-confirmation';

test('confirms the retained simulation after a lost reply', async ({ page }, info) => {
  await verifyImportConfirmation(page, info);
});
