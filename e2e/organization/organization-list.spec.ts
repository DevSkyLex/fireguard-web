import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationListPage } from '../support/pages/organization-list.page';

/**
 * Organization list — `/organizations` (`OrganizationListPage`,
 * `src/app/features/organization`).
 */
test.describe('Organization list', () => {
  test('renders the list for an authenticated user', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    const organizationListPage = new OrganizationListPage(page);
    await organizationListPage.goto();

    await expect(organizationListPage.newOrganizationButton).toBeVisible();
  });
});
