import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

for (const scene of [
  { width: 1024, height: 768, dark: false },
  { width: 1440, height: 900, dark: false },
  { width: 1440, height: 900, dark: true },
  { width: 1920, height: 1080, dark: false },
]) {
  test(`balances the desktop auth split at ${scene.width}px in ${scene.dark ? 'dark' : 'light'} mode`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: scene.width, height: scene.height });
    if (!baseURL) throw new Error('A test server URL is required.');
    if (scene.dark) await setDarkTheme(context, baseURL);
    await new ApiMock(page).mockUnauthenticatedSession();
    const auth = new AuthPages(page);
    await auth.gotoLogin();
    await expect(auth.loginSubmit).toBeInViewport();
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(page.locator('#split-layout-showcase'));
    const shell = await page.locator('#split-layout').boundingBox();
    const panel = await page.locator('#split-layout-showcase').boundingBox();
    const column = await page.locator('#split-layout-column').boundingBox();
    const form = await auth.loginRoot.boundingBox();
    if (!shell || !panel || !column || !form)
      throw new Error('The split layout must be measurable.');
    expect(shell.width).toBeLessThanOrEqual(1600);
    expect(panel.width / shell.width).toBeGreaterThan(0.4);
    expect(panel.width / shell.width).toBeLessThan(0.46);
    expect(panel.y).toBe(0);
    expect(panel.height).toBe(scene.height);
    await expect(page.locator('#split-layout-showcase')).toHaveCSS('border-radius', '0px');
    expect(form.width).toBeLessThanOrEqual(448);
    expect(Math.abs(form.x + form.width / 2 - (column.x + column.width / 2))).toBeLessThan(2);
    await expect(page.locator('#split-layout-showcase li').last()).toBeInViewport();
    await page.screenshot({
      path: `e2e/artifacts/auth-split-desktop/login-${scene.width}-${scene.dark ? 'dark' : 'light'}.png`,
      animations: 'disabled',
    });
    await page.goto('/auth/register');
    await expect(auth.registerSubmit).toBeInViewport();
    await page.screenshot({
      path: `e2e/artifacts/auth-split-desktop/register-${scene.width}-${scene.dark ? 'dark' : 'light'}.png`,
      animations: 'disabled',
    });
  });
}
