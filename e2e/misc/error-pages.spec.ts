import { expect, test } from '@playwright/test';
import { ErrorPage } from '../support/pages/error.page';

/**
 * Static error pages — `/error/404`, `/error/403`, `/error/500`
 * (`FocusedLayout`, `src/app/features/error`). No guards, no data-access.
 */
test.describe('Error pages', () => {
  test('renders the 404 page and links back home', async ({ page }) => {
    const errorPage = new ErrorPage(page);
    await errorPage.goto('/error/404');

    await expect(errorPage.heading).toHaveText('404');
    await expect(errorPage.homeLink).toBeVisible();
  });

  test('renders the 403 page', async ({ page }) => {
    const errorPage = new ErrorPage(page);
    await errorPage.goto('/error/403');

    await expect(errorPage.heading).toHaveText('403');
  });

  test('renders the 500 page', async ({ page }) => {
    const errorPage = new ErrorPage(page);
    await errorPage.goto('/error/500');

    await expect(errorPage.heading).toHaveText('500');
  });

  test('redirects an unknown top-level route to 404', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page).toHaveURL('/error/404');
  });
});
