import { test } from '@playwright/test';
import { verifyBillingConfirmation } from '../support/helpers/billing-confirmation';

test('keeps a delayed Checkout pending and confirms the plan after a keyboard refresh', async ({
  page,
}, info) => {
  await verifyBillingConfirmation(page, info);
});
