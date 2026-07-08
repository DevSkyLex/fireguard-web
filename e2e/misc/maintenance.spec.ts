import { expect, test } from '@playwright/test';
import { MaintenancePage } from '../support/pages/maintenance.page';

/**
 * Static maintenance page — `/maintenance` (`FocusedLayout`,
 * `src/app/features/maintenance`). No guards, no data-access.
 *
 * The `maintenanceGuard` that would redirect other routes here is driven by
 * `environment.maintenance` (a build-time flag, `false` in the `e2e`
 * config), so it is not exercised by these tests — only direct navigation.
 */
test.describe('Maintenance page', () => {
  test('renders with a retry action', async ({ page }) => {
    const maintenancePage = new MaintenancePage(page);
    await maintenancePage.goto();

    await expect(maintenancePage.retryButton).toBeVisible();
  });
});
