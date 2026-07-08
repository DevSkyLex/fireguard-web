import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { AccountPage } from '../support/pages/account.page';

/**
 * Account page — `/account` (`AccountPage`, `src/app/features/account`).
 *
 * Scoped to the default "profile" section, which needs no endpoint beyond
 * the already-mocked `/api/me`. The "security" and "notifications" sections
 * call additional endpoints (sessions, trusted devices, notification types)
 * intentionally left unmocked for this pass — see `e2e/README.md`.
 */
test.describe('Account page', () => {
  test('renders the profile section with the signed-in user', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ profile: { firstName: 'Ella', lastName: 'Uzer' } });

    const accountPage = new AccountPage(page);
    await accountPage.goto();

    await expect(accountPage.displayName).toContainText('Ella');
    await expect(accountPage.nav).toBeVisible();
  });

  test('switches to the settings section via the tab query param', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    const accountPage = new AccountPage(page);
    await accountPage.goto('settings');

    await expect(page).toHaveURL('/account?tab=settings');
    await expect(accountPage.sectionTitle).toBeVisible();
  });
});
