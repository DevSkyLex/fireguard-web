import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { mockMessagesWorkspace } from '../support/helpers/direct-messages';

for (const width of [390, 320]) {
  test(`mobile messages at ${width}px keeps list, thread and saved routes reachable`, async ({
    page,
    context,
    baseURL,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.setViewportSize({ width, height: 844 });
    if (width === 320) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await mockMessagesWorkspace(page, 8);
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages`);
    const extension = page.locator('#dashboard-sidebar-extension');
    await expect(page.getByTestId('direct-messages-panel-row')).toHaveCount(8);
    await expect(extension).toBeVisible();
    await expect(page.locator('#dashboard-main')).toBeHidden();
    await page.getByTestId('dashboard-skip-link').focus();
    await page.keyboard.press('Enter');
    await expect(extension).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(extension);
    await page.screenshot({
      path: `e2e/artifacts/messages-extension-mobile-${width}-list.png`,
      animations: 'disabled',
    });
    await page.getByTestId('direct-messages-panel-row').first().click();
    await expect(page.getByTestId('direct-conversation-name')).toHaveText('Ines Pector');
    await expect(extension).toBeHidden();
    const back = page.getByTestId('direct-conversation-back');
    await expect(back).toBeVisible();
    expect((await back.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(page.locator('#dashboard-main'));
    await page.screenshot({
      path: `e2e/artifacts/messages-extension-mobile-${width}-thread.png`,
      animations: 'disabled',
    });
    await back.click();
    await expect(extension).toBeVisible();
    await page.getByTestId('direct-messages-panel-saved').click();
    await expect(page.getByTestId('saved-messages-title')).toBeVisible();
    await expect(extension).toBeHidden();
    await page.getByTestId('saved-messages-back').click();
    await expect(extension).toBeVisible();
    await extension.getByRole('button', { name: 'Toggle sidebar', exact: true }).click();
    await expect(page.getByTestId('direct-messages-nav-link')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
