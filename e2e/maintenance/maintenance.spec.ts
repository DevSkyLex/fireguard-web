import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { pagePolishScreenshotDir } from '../support/helpers/screenshot-dir';
import { API_BASE_URL, ApiMock } from '../support/mocks/api-mock';

test.describe('Maintenance mode', () => {
  test('lands on the maintenance page when the API answers 503, not on not-found', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    // Registered last, so it wins over the session mocks above: every API call
    // this navigation makes now answers 503, which is what a backend outage
    // looks like to the client.
    await page.route(`${API_BASE_URL}/api/**`, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/ld+json',
        body: JSON.stringify({ status: 503, title: 'Service Unavailable' }),
      });
    });

    await page.goto('/');

    await expect(page).toHaveURL(/\/maintenance$/);
    await expect(page.locator('#maintenance-page')).toBeVisible();
  });

  test('renders the maintenance page on its own route', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    await page.goto('/maintenance');

    await expect(page.locator('#maintenance-page')).toBeVisible();
    await expect(page.getByTestId('maintenance-retry')).toBeVisible();
  });
});

test.describe('visual evidence', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox is broken in this suite.');

  test('renders the maintenance page à 375px en mode sombre', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 812 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    await page.goto('/maintenance');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#maintenance-page')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/maintenance-375-dark.png`,
    });
  });

  test('renders the maintenance page à 1280px en mode clair', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    await page.goto('/maintenance');

    await expect(page.locator('#maintenance-page')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/maintenance-1280-light.png`,
    });
  });
});
