import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

test.use({ colorScheme: 'light' });

test('changes appearance from the native mobile drawer and restores its trigger focus', async ({
  page,
  context,
  browserName,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
  const api = new ApiMock(page);
  await api.mockUnauthenticatedSession();
  const auth = new AuthPages(page);
  await auth.gotoLogin();
  await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
  await auth.loginEmail.fill('mobile-theme@fireguard.test');

  const trigger = page.getByRole('button', { name: /^Appearance:/ });
  await trigger.focus();
  await trigger.press('Enter');
  const drawer = page
    .getByRole('dialog', { name: 'Appearance', exact: true })
    .locator('[data-slot="drawer-content"]');
  await drawer.getByText('Dark', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `e2e/artifacts/theme-circle-blur/${info.project.name}/dark-drawer.png`,
  });
  await drawer.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toHaveAccessibleName('Appearance: Dark');
  await expect(trigger).toBeFocused();
  await expect(auth.loginEmail).toHaveValue('mobile-theme@fireguard.test');
  await page.screenshot({
    path: `e2e/artifacts/theme-circle-blur/${info.project.name}/dark-settled.png`,
  });
});
