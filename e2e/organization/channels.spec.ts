import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  channelOutput,
  channelParticipantOutput,
  E2E_CHANNEL_ID,
  inspectionsChannelOutput,
  inspectionsUrgentChannelOutput,
  inspectorMessageOutput,
  messageOutput,
} from '../support/fixtures/channel-fixtures';
import {
  inspectorOrganizationMemberOutput,
  organizationMemberOutput,
} from '../support/fixtures/member-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { ChannelConversationPage } from '../support/pages/channel-conversation.page';
import { ChannelsPage } from '../support/pages/channels.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard/92f41712-7d5f-443b-af9a-18c346a39be0/scratchpad/screenshots';

test.describe('Channels list', () => {
  test('renders the favorites section, the one-level tree and an unread badge', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChannelList([
      channelOutput(),
      inspectionsChannelOutput(),
      inspectionsUrgentChannelOutput(),
    ]);
    const channels = new ChannelsPage(page);

    await channels.goto(E2E_ORGANIZATION_ID);

    await expect(channels.list).toBeVisible();
    await expect(channels.favorites).toBeVisible();
    await expect(channels.favorites.getByText('general')).toBeVisible();
    await expect(channels.tree).toBeVisible();
    // "general" is both favorited and a root channel, so it renders once in
    // Favorites and again under All channels — 4 rows for 3 distinct channels.
    await expect(channels.rows).toHaveCount(4);
    await expect(channels.favorites.getByLabel('2 unread')).toBeVisible();
  });

  test('opens the new-channel dialog', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChannelList([inspectionsChannelOutput()]);
    const channels = new ChannelsPage(page);

    await channels.goto(E2E_ORGANIZATION_ID);
    await expect(channels.rows).toHaveCount(1);

    await channels.openChannelCreateDialog();
    await expect(channels.newDialog).toBeVisible();
    await expect(channels.newNameInput).toBeVisible();
  });

  test('hides "New channel" without messaging.manage', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: ['organization.messaging.read'],
    });
    await api.mockChannelList([inspectionsChannelOutput()]);
    const channels = new ChannelsPage(page);

    await channels.goto(E2E_ORGANIZATION_ID);

    await expect(channels.rows).toHaveCount(1);
    await expect(channels.newButton).toHaveCount(0);
  });

  test('renders at 375px in dark mode with no console errors and no horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChannelList([channelOutput(), inspectionsChannelOutput()]);
    const channels = new ChannelsPage(page);

    await channels.goto(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(channels.list).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/channels-list-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChannelList([
      channelOutput(),
      inspectionsChannelOutput(),
      inspectionsUrgentChannelOutput(),
    ]);
    const channels = new ChannelsPage(page);

    await channels.goto(E2E_ORGANIZATION_ID);

    await expect(channels.list).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/channels-list-light-desktop.png` });
  });
});

test.describe('Channel conversation', () => {
  test('renders the thread, the composer and opens the participants sheet, edit dialog and delete confirmation', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChannelList([channelOutput()]);
    await api.mockChannelDetail(channelOutput());
    await api.mockChannelMessages(E2E_CHANNEL_ID, [messageOutput(), inspectorMessageOutput()]);
    await api.mockChannelParticipants(E2E_CHANNEL_ID, [channelParticipantOutput()]);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
      organizationMemberOutput(),
      inspectorOrganizationMemberOutput(),
    ]);
    await api.mockConversationMarkRead(E2E_CHANNEL_ID);
    await api.mockChannelSubscription(E2E_CHANNEL_ID);
    const conversation = new ChannelConversationPage(page);

    await conversation.goto(E2E_ORGANIZATION_ID, E2E_CHANNEL_ID);

    await expect(conversation.header).toBeVisible();
    await expect(conversation.name).toHaveText('#general');
    await expect(conversation.thread).toBeVisible();
    await expect(
      page.getByText('Fire extinguisher check on the north wing is done.'),
    ).toBeVisible();
    await expect(page.getByText('Noted, thanks!')).toBeVisible();
    await expect(conversation.composerInput).toBeVisible();

    await conversation.openActionsMenu();
    await conversation.participantsAction.click();
    await expect(conversation.participantsSheet).toBeVisible();
    await page.keyboard.press('Escape');

    await conversation.openActionsMenu();
    await conversation.editAction.click();
    await expect(conversation.editDialog).toBeVisible();
    await page.keyboard.press('Escape');

    await conversation.openActionsMenu();
    await conversation.deleteAction.click();
    await expect(conversation.deleteDialog).toBeVisible();
    await expect(conversation.deleteConfirm).toBeVisible();
  });

  test('renders at 375px in dark mode with no console errors and no horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChannelList([channelOutput()]);
    await api.mockChannelDetail(channelOutput());
    await api.mockChannelMessages(E2E_CHANNEL_ID, [messageOutput()]);
    await api.mockChannelParticipants(E2E_CHANNEL_ID, [channelParticipantOutput()]);
    await api.mockConversationMarkRead(E2E_CHANNEL_ID);
    await api.mockChannelSubscription(E2E_CHANNEL_ID);
    const conversation = new ChannelConversationPage(page);

    await conversation.goto(E2E_ORGANIZATION_ID, E2E_CHANNEL_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(conversation.thread).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/channel-conversation-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockChannelList([channelOutput()]);
    await api.mockChannelDetail(channelOutput());
    await api.mockChannelMessages(E2E_CHANNEL_ID, [messageOutput(), inspectorMessageOutput()]);
    await api.mockChannelParticipants(E2E_CHANNEL_ID, [channelParticipantOutput()]);
    await api.mockConversationMarkRead(E2E_CHANNEL_ID);
    await api.mockChannelSubscription(E2E_CHANNEL_ID);
    const conversation = new ChannelConversationPage(page);

    await conversation.goto(E2E_ORGANIZATION_ID, E2E_CHANNEL_ID);

    await expect(conversation.thread).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/channel-conversation-light-desktop.png` });
  });
});
