import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Proves a form sheet's unsaved-changes gate: `bail` (Escape, Cancel, an
 * outside click) must raise the shared confirmation instead of closing the
 * sheet, and "Discard" must then close it. The sheet mirrors its dirty flag
 * as `data-dirty`; the helper waits for it so `bail` never races the form's
 * `dirtyChanged` relay, which lands one change-detection pass after the
 * keystroke.
 */
export async function expectSheetGuardHolds(
  page: Page,
  sheet: Locator,
  bail: () => Promise<void>,
): Promise<void> {
  await expect(sheet).toHaveAttribute('data-dirty', 'true');
  await bail();
  await expect(page.getByTestId('unsaved-changes-dialog')).toBeVisible();
  await expect(sheet).toBeVisible();

  await page.getByTestId('unsaved-changes-discard').click();
  await expect(sheet).toBeHidden();
}
