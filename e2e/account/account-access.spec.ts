import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { AccountPage } from '../support/pages/account.page';

/**
 * The account's "Access" section.
 *
 * `/api/me` has always returned `roles` and `permissions`, and `UserStore` has
 * always exposed them — nothing rendered either, so a user had no way to see
 * what their account is allowed to do.
 */
test.describe('Account access', () => {
  test('lists the global roles and the permissions they resolve to', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      profile: {
        roles: ['ROLE_ADMIN', 'ROLE_USER'],
        permissions: ['audit.read', 'users.manage', 'profile.update'],
      },
    });

    const accountPage = new AccountPage(page);
    await accountPage.goto('access');

    const roles = page.getByTestId('account-role');
    await expect(roles).toHaveCount(2);
    await expect(roles.first()).toContainText('ROLE_ADMIN');

    const permissions = page.getByTestId('account-permission');
    await expect(permissions).toHaveCount(3);
    await expect(permissions.first()).toContainText('audit.read');
  });

  // A role granting nothing platform-wide is a real state; an empty list must
  // say so rather than render a blank card.
  test('says so when the account carries neither', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ profile: { roles: [], permissions: [] } });

    const accountPage = new AccountPage(page);
    await accountPage.goto('access');

    await expect(page.getByTestId('account-role')).toHaveCount(0);
    await expect(page.getByTestId('account-permission')).toHaveCount(0);
    await expect(page.locator('app-account-access-panel')).toContainText('No platform-wide role');
  });

  // The tab is reachable by URL, so a shared link must land on it.
  test('lands directly on the section from ?tab=access', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    const accountPage = new AccountPage(page);
    await accountPage.goto('access');

    await expect(page).toHaveURL('/account?tab=access');
    await expect(page.locator('app-account-access-panel')).toBeVisible();
  });
});
