import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { mockMessagesWorkspace } from '../support/helpers/direct-messages';

for (const [width, dark] of [
  [1440, true],
  [375, false],
  [320, true],
] as const) {
  test(`recipient picker stays anchored and supports keyboard selection at ${width}px`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 938 });
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await mockMessagesWorkspace(page, 16);
    await page.goto(
      `/organizations/${E2E_ORGANIZATION_ID}/messages${width > 1024 ? '/e2e-direct-2' : ''}`,
    );
    const trigger = page.getByTestId('direct-messages-panel-new');
    const picker = page.getByTestId('direct-message-picker');
    const search = page.getByTestId('new-direct-message-search');
    await trigger.click();
    await expect(picker).toBeVisible();
    await expect(search).toBeFocused();
    await expect(page.locator('.cdk-overlay-backdrop')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    const box = await picker.boundingBox();
    const anchor = await trigger.boundingBox();
    if (!box || !anchor) throw new Error('The picker and its trigger must have visible bounds.');
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y).toBeGreaterThanOrEqual(anchor.y + anchor.height);
    await page.screenshot({
      path: `e2e/artifacts/message-picker-${width}.png`,
      animations: 'disabled',
    });
    await search.fill('nobody');
    await expect(picker.getByText('No one to message')).toBeVisible();
    await search.press('Escape');
    await expect(picker).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');
    await expect(search).toHaveValue('');
    await search.fill('Ines');
    await expect(page.getByTestId('new-direct-message-candidate')).toHaveCount(1);
    await search.press('ArrowDown');
    await search.press('Enter');
    await expect(picker).toBeHidden();
    await expect(page.getByTestId('direct-conversation-name')).toHaveText('Ines Pector');
  });
}
