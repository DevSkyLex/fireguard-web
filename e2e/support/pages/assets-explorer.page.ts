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

  public readonly nodeMenu: Locator = this.page.getByTestId('assets-tree-node-menu');
  public readonly moveDialog: Locator = this.page.getByTestId('facility-move-dialog');
  public readonly moveSubmit: Locator = this.page.getByTestId('facility-move-submit');

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/assets`);
  }

  public async selectSite(name: string): Promise<void> {
    await this.treeItems.filter({ hasText: name }).first().click();
  }

  /**
   * Method dragNodeOnto
   *
   * @description
   * Simulates a native HTML5 drag from one tree row onto another via
   * `dispatchEvent` — real `dragTo` mouse choreography is flaky against a
   * custom `dragover`/`drop`-driven primitive like `Tree`, so this dispatches
   * `dragstart` → `dragover` → `drop` → `dragend` directly with a shared
   * `DataTransfer`, the documented workaround for Playwright + native DnD.
   *
   * @param {string} fromId - The dragged node's id.
   * @param {string} toId - The drop target node's id.
   *
   * @returns {Promise<void>}
   */
  public async dragNodeOnto(fromId: string, toId: string): Promise<void> {
    await this.page.evaluate(
      ({ fromId: draggedId, toId: targetId }: { fromId: string; toId: string }) => {
        const from = document.querySelector<HTMLElement>(`[data-tree-id="${draggedId}"]`);
        const to = document.querySelector<HTMLElement>(`[data-tree-id="${targetId}"]`);
        if (!from || !to) throw new Error('Tree row not found for drag simulation');

        const dataTransfer = new DataTransfer();
        const fire = (type: string, target: HTMLElement): void => {
          target.dispatchEvent(
            new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }),
          );
        };

        fire('dragstart', from);
        fire('dragover', to);
        fire('drop', to);
        fire('dragend', from);
      },
      { fromId, toId },
    );
  }

  /** Opens the "Move to…" dialog for a tree row from its row menu. */
  public async openMoveDialog(nodeIndex: number): Promise<void> {
    await this.nodeMenu.nth(nodeIndex).click();
    await this.page.getByTestId('assets-tree-node-move').click();
  }
}
