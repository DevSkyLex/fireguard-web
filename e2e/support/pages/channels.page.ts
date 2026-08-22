import type { Locator, Page } from '@playwright/test';

/**
 * Page object ChannelsPage
 *
 * @description
 * Wraps the channels list route (`/organizations/:organizationId/channels`)
 * behind named locators and one method per user intent: the favorites
 * section, the one-level channel tree and the new-channel dialog.
 */
export class ChannelsPage {
  public constructor(private readonly page: Page) {}

  public readonly list: Locator = this.page.getByTestId('channels-list');
  public readonly favorites: Locator = this.page.getByTestId('channels-favorites');
  public readonly tree: Locator = this.page.getByTestId('channels-tree');
  public readonly rows: Locator = this.page.getByTestId('channels-row');
  public readonly newButton: Locator = this.page.getByTestId('channels-new');
  public readonly searchInput: Locator = this.page.getByTestId('channels-search');
  public readonly newDialog: Locator = this.page.getByTestId('channel-create-dialog');
  public readonly newNameInput: Locator = this.page.getByTestId('channel-create-name');
  public readonly newSubmit: Locator = this.page.getByTestId('channel-create-submit');

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/channels`);
  }

  /** Opens the given channel by name from the list. */
  public async openChannel(name: string): Promise<void> {
    await this.rows.filter({ hasText: name }).first().click();
  }

  /** Opens the new-channel dialog from the list header. */
  public async openChannelCreateDialog(): Promise<void> {
    await this.newButton.click();
  }
}
