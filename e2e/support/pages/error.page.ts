import { expect, type Locator, type Page } from '@playwright/test';

/**
 * ErrorPage
 *
 * Page object for the static `/error/*` pages (`FocusedLayout`,
 * `src/app/features/error`). No guards, no data-access — pure static
 * screens, one per HTTP-style status code.
 */
export class ErrorPage {
  public readonly page: Page;
  public readonly heading: Locator;
  public readonly homeLink: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.homeLink = page.locator('a[routerLink="/"]');
  }

  public async goto(path: '/error/404' | '/error/403' | '/error/500'): Promise<void> {
    await this.page.goto(path);
    await expect(this.heading).toBeVisible();
  }
}
