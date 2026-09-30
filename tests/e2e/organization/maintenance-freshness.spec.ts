import { test } from '@playwright/test';
import { verifyMaintenanceFreshness } from '../support/helpers/maintenance-freshness';

test('exposes evaluation coverage and preserves the list date filter in exports', async ({
  page,
}, info) => {
  await verifyMaintenanceFreshness(page, info);
});
