import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { DashboardHomePage } from '../support/pages/dashboard-home.page';

/**
 * Authenticated dashboard landing — `/` (`HomePage` inside `DashboardLayout`).
 *
 * The full boot burst (refresh -> /api/me -> notifications -> onboarding ->
 * organizations) is mocked so the route resolves without a live backend.
 */
test.describe('Dashboard home', () => {
  test('lands an authenticated user with completed onboarding on the home page', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    const homePage = new DashboardHomePage(page);
    await homePage.goto();

    await expect(page).toHaveURL('/');
    await expect(homePage.organizationsQuickAccessLink).toBeVisible();
  });

  test('redirects a user with incomplete onboarding to /onboarding', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ onboarding: { state: 'in_progress' } });

    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('redirects an unauthenticated visitor to the login page', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    await page.goto('/');

    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
