import { test } from '@playwright/test';
import { setDarkTheme } from '../support/helpers/appearance';
import { verifyBillingConfirmation } from '../support/helpers/billing-confirmation';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';

test('keeps the Checkout status and refresh action usable on a dark mobile screen', async ({
  page,
  context,
  baseURL,
}, info) => {
  await emulateMobilePlatform(context, 'android');
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  await verifyBillingConfirmation(page, info);
});
