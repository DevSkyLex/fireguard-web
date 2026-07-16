import { expect, type Locator, type Page } from '@playwright/test';

/**
 * ErrorPage
 *
 * Page object for the static `/error/*` pages (`FocusedLayout`,
 * `src/app/features/error`). No guards, no data-access — pure static
 * screens, one per HTTP-style status code. Each screen shows a large muted
 * status code, a descriptive `h1` title, and at least one "Back to home" CTA.
 */
export class ErrorPage {
  public readonly page: Page;
  public readonly heading: Locator;
  public readonly code: Locator;
  public readonly homeButton: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.code = page.locator('#error-content p').first();
    this.homeButton = page.getByRole('button', { name: /home/i });
  }

  public async goto(path: '/error/404' | '/error/403' | '/error/500'): Promise<void> {
    await this.page.goto(path);
    try {
      await expect(this.heading).toBeVisible({ timeout: 5_000 });
    } catch {
      // The Vite dev server can still be warming a lazy error-page chunk when
      // the first browser hits it. A single reload exercises the same direct
      // URL once the chunk is available and keeps the smoke test deterministic.
      await this.page.reload();
      await expect(this.heading).toBeVisible({ timeout: 10_000 });
    }
  }
}
