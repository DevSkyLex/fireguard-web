import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { ErrorPage } from '../support/pages/error.page';

const ORGANIZATION = organizationOutput();

/**
 * Static error pages — `/error/404`, `/error/403`, `/error/500`
 * (`FocusedLayout`, `src/app/features/error`). No guards, no data-access.
 */
test.describe('Error pages', () => {
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

  test('redirects an unknown top-level route to 404, carrying the address that failed', async ({
    page,
  }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page).toHaveURL('/error/404?from=%2Fthis-route-does-not-exist');
  });

  test('offers the collection an unknown workspace address was reaching for', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });

    await page.goto(`/organizations/${ORGANIZATION.id}/interventions/nope/deeper`);

    const content = page.locator('#error-content');
    await expect(content).toBeVisible();
    // The way back a member actually wants, not just "home".
    await expect(content.getByRole('button', { name: 'Interventions' })).toBeVisible();
    await expect(content.getByRole('button', { name: 'Back to the organization' })).toBeVisible();
  });
});
