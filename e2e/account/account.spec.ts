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

  // `POST /api/me/deactivate` has existed since the profile resource was
  // written and nothing on the frontend called it. It is irreversible from the
  // user's side, so the click must not reach the API before the prompt does.
  test('deactivates the account only after the confirmation is accepted', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    let deactivateCalls = 0;
    await page.route('**/api/me/deactivate', (route) => {
      deactivateCalls += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({ id: 'u1', status: 'inactive' }),
      });
    });

    const accountPage = new AccountPage(page);
    await accountPage.goto();

    await expect(page.getByTestId('account-deactivate-card')).toBeVisible();
    await page.getByTestId('account-deactivate-button').click();

    // The prompt is up and nothing has been sent yet.
    // Two nodes carry role="alertdialog" (PrimeNG's host plus the rendered
    // dialog); the named one is the rendered prompt.
    const dialog = page.getByRole('alertdialog', { name: 'Deactivate account' });
    await expect(dialog).toContainText('administrator');
    expect(deactivateCalls).toBe(0);

    await dialog.getByRole('button', { name: 'Deactivate' }).click();

    await expect.poll(() => deactivateCalls).toBe(1);
  });

  test('abandons deactivation when the prompt is dismissed', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    let deactivateCalls = 0;
    await page.route('**/api/me/deactivate', (route) => {
      deactivateCalls += 1;
      return route.fulfill({ status: 200, contentType: 'application/ld+json', body: '{}' });
    });

    const accountPage = new AccountPage(page);
    await accountPage.goto();

    await page.getByTestId('account-deactivate-button').click();
    const dialog = page.getByRole('alertdialog', { name: 'Deactivate account' });
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toHaveCount(0);
    expect(deactivateCalls).toBe(0);
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
