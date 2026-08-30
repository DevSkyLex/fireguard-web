import type { BrowserContext, Locator, Page } from '@playwright/test';
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
 *
 * It proves the *page* does not overflow, and nothing more. A collection whose
 * table scrolls sideways inside its own `overflow-x-auto` container leaves the
 * document width untouched, so this assertion passes on a table the operator
 * cannot use. Pair it with {@link expectNoInternalOverflow} on every scroll
 * container a page owns.
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
 * Asserts one element does not scroll horizontally inside itself — the
 * assertion `expectNoHorizontalOverflow` structurally cannot make.
 *
 * Point it at the element that owns the overflow, not at its parent: for a
 * spartan table that is `[data-slot="table-container"]` (`HlmTableContainer`
 * carries `overflow-x-auto`), not the page root wrapper around it.
 *
 * The one-pixel tolerance matches `expectNoHorizontalOverflow`'s: sub-pixel
 * layout rounding routinely puts `scrollWidth` one above `clientWidth` on an
 * element that visibly does not scroll.
 */
export async function expectNoInternalOverflow(locator: Locator): Promise<void> {
  await expect(locator, 'the element under test must exist to be measured').toHaveCount(1);

  const overflow = await locator.evaluate((element: HTMLElement) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));

  expect(overflow.scrollWidth, 'element.scrollWidth').toBeLessThanOrEqual(overflow.clientWidth + 1);
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
