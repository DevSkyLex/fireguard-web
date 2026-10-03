import { test } from '@playwright/test';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { registerPendingLogoutScenarios } from '../support/helpers/logout-pending';

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

test.describe('Logout with persisted local work on a phone', () => {
  registerPendingLogoutScenarios(true);
});
