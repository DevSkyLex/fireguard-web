import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { ErrorPage } from '../support/pages/error.page';

/**
 * Static error pages — `/error/404`, `/error/403`, `/error/500`
 * (`FocusedLayout`, `src/app/features/error`). No guards, no data-access.
 *
 * The session bootstrap is mocked even though the pages are public: the app
 * initializer otherwise talks to the REAL backend, and this hermetic suite
 * must not depend on whether that process happens to be up.
 */
test.describe('Error pages', () => {
  test.beforeEach(async ({ page }) => {
    await new ApiMock(page).mockUnauthenticatedSession();
  });
  test('renders the 404 page and links back home', async ({ page }) => {
    const errorPage = new ErrorPage(page);
    await errorPage.goto('/error/404');

    await expect(errorPage.code).toHaveText('404');
    await expect(errorPage.homeButton).toBeVisible();
  });

  test('renders the 403 page', async ({ page }) => {
    const errorPage = new ErrorPage(page);
    await errorPage.goto('/error/403');

    await expect(errorPage.code).toHaveText('403');
  });

  test('renders the 500 page', async ({ page }) => {
    const errorPage = new ErrorPage(page);
    await errorPage.goto('/error/500');

    await expect(errorPage.code).toHaveText('500');
  });

  test('redirects an unknown top-level route to 404', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page).toHaveURL('/error/404');
  });
});
