import { test } from '@playwright/test';
import { verifyImportResumption } from '../support/helpers/import-resumption';

test('resumes the same import by keyboard and preserves confirmed rows', async ({ page }, info) => {
  await verifyImportResumption(page, info);
});
