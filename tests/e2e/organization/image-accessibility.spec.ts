import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { expectAccessibleImage } from '../support/helpers/accessibility-evidence';
import { setDarkTheme } from '../support/helpers/appearance';
import { mockMessagesWorkspace } from '../support/helpers/direct-messages';

for (const dark of [false, true]) {
  test(`preserves named presence graphics and visible colors in ${dark ? 'dark' : 'light'} mode`, async ({
    page,
    context,
    baseURL,
  }) => {
    if (dark) {
      if (!baseURL) throw new Error('Expected the configured E2E base URL');
      await setDarkTheme(context, baseURL);
    }
    await mockMessagesWorkspace(page);
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages/e2e-direct-2`);
    const active = page
      .locator('#account-menu-trigger')
      .getByRole('img', { name: 'Active', exact: true });
    const offline = page
      .getByTestId('message-thread')
      .getByRole('img', { name: 'Offline', exact: true })
      .first();
    const theme = dark ? 'dark' : 'light';
    await expectAccessibleImage(page, active, 'Active', `presence-active-${theme}`);
    await expectAccessibleImage(page, offline, 'Offline', `presence-offline-${theme}`);
    const activeFill = await active.locator('circle').evaluate((el) => getComputedStyle(el).fill);
    const offlineFill = await offline.locator('circle').evaluate((el) => getComputedStyle(el).fill);
    expect(activeFill).not.toBe(offlineFill);
    expect(activeFill).not.toBe('none');
    expect(offlineFill).not.toBe('none');
  });
}
