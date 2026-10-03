import { test } from '@playwright/test';
import { registerPendingLogoutScenarios } from '../support/helpers/logout-pending';

test.describe('Logout with persisted local work on desktop', () => {
  registerPendingLogoutScenarios(false);
});
