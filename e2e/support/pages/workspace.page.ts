import { type Locator, type Page } from '@playwright/test';

/**
 * WorkspacePage
 *
 * Page object for `/organizations/:organizationId/workspace`
 * (`WorkspaceLayout`, `src/app/layouts/workspace-layout`).
 *
 * Scoped to shell structure: the collaboration columns are empty until the
 * rail, sidebar and panel contributions land (phases 2 and 4), so this object
 * exposes the frame itself rather than any content.
 */
export class WorkspacePage {
  public readonly page: Page;
  public readonly shell: Locator;
  public readonly rail: Locator;
  public readonly sidebar: Locator;
  public readonly main: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.shell = page.locator('#workspace-layout');
    this.rail = page.locator('app-workspace-layout-rail');
    this.sidebar = page.locator('app-workspace-layout-secondary-nav');
    this.main = this.shell.locator('main');
  }

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/workspace`);
    await this.shell.waitFor({ state: 'visible' });
  }
}
