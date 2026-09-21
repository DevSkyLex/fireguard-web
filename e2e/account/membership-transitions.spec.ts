import { test } from '@playwright/test';
import { verifyMembershipTransitions } from '../support/helpers/membership-transitions';
test('refreshes memberships before choosing the next workspace', async ({ page }, info) => {
  await verifyMembershipTransitions(page, info);
});
