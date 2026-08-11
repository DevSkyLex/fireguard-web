import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Sets the `theme-preference` cookie `ThemeService` reads on boot, so a page
 * renders `html[data-theme="dark"]` from the very first paint instead of
 * requiring a post-load toggle click. Call before `page.goto`.
 */
export async function setDarkTheme(context: BrowserContext, baseURL: string): Promise<void> {
  await context.addCookies([
    {
      name: 'theme-preference',
      value: 'dark',
      url: baseURL,
    },
  ]);
}

/**
 * Asserts the document has no horizontal scrollbar — the responsive-layout
 * proof a unit spec cannot give, since jsdom never lays out real CSS.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
  });

  expect(overflow.scrollWidth, 'document.documentElement.scrollWidth').toBeLessThanOrEqual(
    overflow.clientWidth + 1,
  );
}

/**
 * Starts collecting browser console `error` messages. Call before navigation
 * and assert the returned array is empty once the page has settled.
 */
export function collectConsoleErrors(page: Page): readonly string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}
