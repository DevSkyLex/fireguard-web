import { expect, test } from '@playwright/test';
import { expectMinimumCssPixels, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import {
  EXPORT_INITIAL_ID,
  installMaintenanceExports,
} from '../support/mocks/maintenance-export-api-mock';
import { MaintenanceExportsPage } from '../support/pages/maintenance-exports.page';

for (const dark of [false, true]) {
  test(`keeps published dossier selection, exact archive recovery and explicit import confirmation usable by touch in ${dark ? 'dark' : 'light'} mode`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const state = await installMaintenanceExports(page, { loseCreateReply: true });
    const exports = new MaintenanceExportsPage(page);
    await exports.goto();
    await exports.prepareExport();
    await exports.capture(info, 'touch-source-selection-' + (dark ? 'dark' : 'light'));
    await exports.generate();
    await expect(exports.recover).toBeVisible();
    await exports.recover.scrollIntoViewIfNeeded();
    const bounds = await exports.recover.boundingBox();
    if (!bounds)
      throw new Error('The uncertain archive recovery action must have visible touch bounds.');
    expectMinimumCssPixels(bounds.height, 44);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('The mobile project must supply its device viewport.');
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
    await exports.recover.tap();
    await expect(exports.editor).toBeHidden();
    expect(state.createAttempts[1]).toEqual(state.createAttempts[0]);
    expect(state.committedArchives).toBe(1);
    await expect(exports.detail).toContainText('No external import has been confirmed');
    const originalBytes = state.files.get(EXPORT_INITIAL_ID);
    await exports.prepareConfirmation('ERP-TOUCH-IMPORT-0041');
    await exports.capture(info, 'touch-explicit-import-reference-' + (dark ? 'dark' : 'light'));
    await exports.confirmImport();
    await expect(exports.detail).toContainText('ERP-TOUCH-IMPORT-0041');
    expect(state.archives.get(EXPORT_INITIAL_ID)?.state).toBe('import_confirmed');
    expect(state.files.get(EXPORT_INITIAL_ID)).toEqual(originalBytes);
    const archiveLink = page.getByTestId('maintenance-export-archives').getByRole('link').first();
    await archiveLink.scrollIntoViewIfNeeded();
    const linkBounds = await archiveLink.boundingBox();
    if (!linkBounds)
      throw new Error('The retained archive link must have an actual clickable touch target.');
    expectMinimumCssPixels(linkBounds.height, 44);
    await exports.detail.scrollIntoViewIfNeeded();
    await exports.capture(info, 'touch-confirmed-retained-archive-' + (dark ? 'dark' : 'light'));
  });
}
