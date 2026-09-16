import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

const WORKSPACE_URL = `/organizations/${E2E_ORGANIZATION_ID}/more`;

test.describe('Account navigation', () => {
  test('shows Windows shortcut hints consistently in both sidebar menus', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', { configurable: true, get: () => 'Win32' });
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        get: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      });
    });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    await page.goto(WORKSPACE_URL);
    await expect(page.locator('#dashboard-layout')).toBeVisible();

    await page.locator('#organization-switcher-trigger').click();
    await expect(page.getByRole('menu').locator('[data-slot="dropdown-menu-shortcut"]')).toHaveText(
      ['Ctrl+,', 'Ctrl+B', 'Ctrl+M', 'Ctrl+J'],
    );
    await page.keyboard.press('Escape');

    await page.locator('#account-menu-trigger').click();
    await expect(page.getByRole('menu').locator('[data-slot="dropdown-menu-shortcut"]')).toHaveText(
      ['Ctrl+P', 'Ctrl+S', 'Ctrl+O', 'Ctrl+N'],
    );
  });

  test('opens the account profile from the sidebar account menu', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    await page.goto(WORKSPACE_URL);
    await expect(page.locator('#dashboard-layout')).toBeVisible();

    await page.locator('#account-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Account', exact: true }).click();

    await expect(page).toHaveURL(/\/account\/profile$/);
    await expect(page.locator('#account-profile')).toBeVisible();
    await expect(page.getByTestId('account-tab-profile')).toHaveAttribute('aria-selected', 'true');
  });

  test('logs out from the sidebar account menu and returns to sign-in', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockLogout();

    await page.goto(WORKSPACE_URL);
    await expect(page.locator('#dashboard-layout')).toBeVisible();

    await page.locator('#account-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Log out', exact: true }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.locator('#login-page')).toBeVisible();
  });

  test('ends the local session when remote logout fails', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockLogout({ status: 503 });

    await page.goto(WORKSPACE_URL);
    await expect(page.locator('#dashboard-layout')).toBeVisible();

    await page.locator('#account-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Log out', exact: true }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.locator('#login-page')).toBeVisible();
  });

  test('logs out from the forbidden page without returning to the blocked workspace', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockLogout();

    await page.goto('/error/403');
    await expect(page.locator('#forbidden-page')).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.locator('#login-page')).toBeVisible();
  });
});
