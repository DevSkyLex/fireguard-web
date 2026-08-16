import type { Locator, Page } from '@playwright/test';

/**
 * Page object AssetsExplorerPage
 *
 * @description
 * Wraps the estate explorer route (`/organizations/:organizationId/assets`)
 * behind named locators and one method per user intent.
 */
export class AssetsExplorerPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#organization-assets');

  public readonly siteTab: Locator = this.page.getByTestId('assets-tab-site');
  public readonly everythingTab: Locator = this.page.getByTestId('assets-tab-everything');

  public readonly treePanel: Locator = this.page.getByTestId('assets-tree-panel');
  public readonly treeItems: Locator = this.page.getByTestId('tree-item');
  public readonly treeToggle: Locator = this.page.getByTestId('tree-toggle');

  public readonly equipmentPane: Locator = this.page.getByTestId('assets-equipment-pane');
  public readonly equipmentRows: Locator = this.page.getByTestId('assets-equipment-row');
  public readonly inspectionsPane: Locator = this.page.getByTestId('assets-inspections-pane');
  public readonly inspectionsRows: Locator = this.page.getByTestId('assets-inspections-row');

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/assets`);
  }

  public async selectSite(name: string): Promise<void> {
    await this.treeItems.filter({ hasText: name }).first().click();
  }
}
