import { expect, test } from '@playwright/test';
import { MaintenancePage } from '../support/pages/maintenance.page';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * Static maintenance page — `/maintenance` (`FocusedLayout`,
 * `src/app/features/maintenance`). No guards, no data-access.
 *
 * The `maintenanceGuard` that would redirect other routes here is driven by
 * `environment.maintenance` (a build-time flag, `false` in the `e2e`
 * config), so it is not exercised by these tests — only direct navigation.
 *
 * The session bootstrap is mocked even though the page is public: without a
 * mock the app initializer talks to the REAL backend, and this hermetic
 * suite must not depend on whether that process happens to be up.
 */
test.describe('Maintenance page', () => {
  test('renders with a retry action', async ({ page }) => {
    await new ApiMock(page).mockUnauthenticatedSession();
    const maintenancePage = new MaintenancePage(page);
    await maintenancePage.goto();

    await expect(maintenancePage.retryButton).toBeVisible();
  });
});
