import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

test.describe('Account navigation', () => {
  test('opens the account profile from the sidebar account menu', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}`);
    await expect(page.locator('#dashboard-layout')).toBeVisible();

    await page.locator('#account-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Account', exact: true }).click();

    await expect(page).toHaveURL(/\/account\/profile$/);
    await expect(page.locator('#account-profile')).toBeVisible();
    await expect(page.getByTestId('account-tab-profile')).toHaveAttribute('aria-selected', 'true');
  });
});
