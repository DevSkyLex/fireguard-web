import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

test('logs out from the mobile More destination and replaces the workspace route', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockLogout();

  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
  await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
  await expect(page.locator('#organization-more-page')).toBeVisible();

  await page.getByTestId('logout-control').click();

  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.locator('#login-page')).toBeVisible();
  await page.goBack();
  expect(page.url()).not.toContain('/organizations/');
});
