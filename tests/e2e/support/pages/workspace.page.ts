import type { Locator, Page } from '@playwright/test';

/** Page object for explicit workspace discovery and request tracking. */
export class WorkspacePage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#onboarding-workspace-page');
  public readonly title: Locator = this.root.getByRole('heading', { level: 1 });
  public readonly create: Locator = this.root.getByRole('button', {
    name: 'Create an organization',
    exact: true,
  });
  public readonly request: Locator = this.root.getByRole('button', {
    name: 'Request to join',
    exact: true,
  });
  public readonly cancel: Locator = this.root.getByRole('button', {
    name: 'Cancel request',
    exact: true,
  });
  public readonly accept: Locator = this.root.getByRole('button', {
    name: 'Accept invitation',
    exact: true,
  });
  public readonly retry: Locator = this.root.getByRole('button', { name: 'Retry', exact: true });

  /** Opens the workflow resolver with a local destination preserved. */
  public async goto(returnUrl = ''): Promise<void> {
    await this.page.goto(
      `/onboarding${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`,
    );
  }
}
