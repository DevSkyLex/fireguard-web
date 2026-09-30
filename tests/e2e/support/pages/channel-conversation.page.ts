import type { Locator, Page } from '@playwright/test';

/**
 * Page object ChannelConversationPage
 *
 * @description
 * Wraps one channel's room (`/organizations/:organizationId/channels/:channelId`)
 * behind named locators and one method per user intent: the header, the
 * thread, the composer, the actions menu and its dialogs/sheet.
 */
export class ChannelConversationPage {
  public constructor(private readonly page: Page) {}

  public readonly header: Locator = this.page.getByTestId('channel-conversation-header');
  public readonly name: Locator = this.page.getByTestId('channel-conversation-name');
  public readonly participantsCountButton: Locator = this.page.getByTestId(
    'channel-conversation-participants-count',
  );
  public readonly thread: Locator = this.page.getByTestId('message-thread');
  public readonly composerInput: Locator = this.page.getByTestId('message-composer-input');
  public readonly composerSend: Locator = this.page.getByTestId('message-composer-send');
  public readonly actionsTrigger: Locator = this.page.getByTestId('channel-conversation-actions');
  public readonly participantsAction: Locator = this.page.getByTestId(
    'channel-conversation-participants-action',
  );
  public readonly editAction: Locator = this.page.getByTestId('channel-conversation-edit-action');
  public readonly deleteAction: Locator = this.page.getByTestId(
    'channel-conversation-delete-action',
  );
  public readonly editDialog: Locator = this.page.getByTestId('channel-edit-dialog');
  public readonly participantsSheet: Locator = this.page.getByTestId('channel-participants-sheet');
  public readonly deleteDialog: Locator = this.page.getByTestId('channel-delete-dialog');
  public readonly deleteConfirm: Locator = this.page.getByTestId('channel-delete-confirm');

  public async goto(organizationId: string, channelId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/channels/${channelId}`);
  }

  /** Opens the header's actions menu. */
  public async openActionsMenu(): Promise<void> {
    await this.actionsTrigger.click();
  }
}
