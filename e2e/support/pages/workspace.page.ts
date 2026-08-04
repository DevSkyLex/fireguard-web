import { type Locator, type Page } from '@playwright/test';

/**
 * WorkspacePage
 *
 * Page object for the application shell (`WorkspaceLayout`,
 * `src/app/layouts/workspace-layout`), entered at
 * `/organizations/:organizationId`.
 *
 * Scoped to shell structure: it exposes the frame itself — sidebar and main
 * column — rather than the content any given route renders inside it. The
 * shell has no separate organization rail; the active organization and the
 * switcher live in the sidebar's own header (`app-organization-switcher`,
 * see `workspace-switcher.spec.ts`).
 */
export class WorkspacePage {
  public readonly page: Page;
  public readonly shell: Locator;
  public readonly sidebar: Locator;
  public readonly main: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.shell = page.locator('#workspace-layout');
    this.sidebar = page.locator('app-workspace-layout-secondary-nav');
    this.main = this.shell.locator('main');
  }

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}`);
    await this.shell.waitFor({ state: 'visible' });
  }
}
