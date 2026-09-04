import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  channelOutput,
  channelParticipantOutput,
  E2E_CHANNEL_ID,
  inspectionsChannelOutput,
  inspectionsUrgentChannelOutput,
  messageOutput,
} from '../support/fixtures/channel-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const width of [320, 900]) {
  test(`channels at ${width}px alternate the sidebar list and the room`, async ({
    page,
    context,
    baseURL,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.setViewportSize({ width, height: 844 });
    if (width === 320) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChannelList([
      channelOutput(),
      inspectionsChannelOutput(),
      inspectionsUrgentChannelOutput(),
    ]);
    await api.mockChannelDetail(channelOutput());
    await api.mockChannelMessages(E2E_CHANNEL_ID, [messageOutput()]);
    await api.mockChannelParticipants(E2E_CHANNEL_ID, [channelParticipantOutput()]);
    await api.mockConversationMarkRead(E2E_CHANNEL_ID);
    await api.mockChannelSubscription(E2E_CHANNEL_ID);
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/channels`);
    const extension = page.locator('#dashboard-sidebar-extension');
    const main = page.locator('#dashboard-main');
    await expect(page.getByTestId('channels-row')).toHaveCount(4);
    await expect(extension).toBeVisible();
    await expect(main).toBeHidden();
    await page.getByTestId('dashboard-skip-link').focus();
    await page.keyboard.press('Enter');
    await expect(extension).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(extension);
    await page.screenshot({
      path: `e2e/artifacts/channels-sidebar/list-${width}.png`,
      animations: 'disabled',
    });
    await page.getByTestId('channels-row').first().click();
    await expect(page.getByTestId('channel-conversation-name')).toHaveText('#general');
    await expect(extension).toBeHidden();
    await expect(main).toBeVisible();
    const back = page.getByTestId('channel-conversation-back');
    await expect(back).toBeVisible();
    expect((await back.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(main);
    await page.screenshot({
      path: `e2e/artifacts/channels-sidebar/thread-${width}.png`,
      animations: 'disabled',
    });
    await back.click();
    await expect(extension).toBeVisible();
    await expect(main).toBeHidden();
    if (width === 320) {
      await extension.getByRole('button', { name: 'Toggle sidebar', exact: true }).click();
      await expect(page.getByTestId('direct-messages-nav-link')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
