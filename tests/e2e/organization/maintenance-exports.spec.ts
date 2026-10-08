import { expect, test } from '@playwright/test';
import {
  EXPORT_ADJUSTMENT_ID,
  EXPORT_INITIAL_ID,
  EXPORT_PRIVATE_ID,
  EXPORT_ARCHIVED_CUSTOMER_ID,
  EXPORT_ARCHIVED_CUSTOMER_NAME,
  EXPORT_SYSTEM,
  installMaintenanceExports,
} from '../support/mocks/maintenance-export-api-mock';
import { MaintenanceExportsPage } from '../support/pages/maintenance-exports.page';

test('maps an archived historical customer without restoration and keeps its identity after switching directory status', async ({
  page,
}) => {
  const state = await installMaintenanceExports(page, { archivedCustomer: true });
  const exports = new MaintenanceExportsPage(page);
  await exports.goto();
  await page.getByRole('button', { name: 'Map a reference', exact: true }).click();
  await exports.editor.getByLabel('External system code', { exact: true }).fill(EXPORT_SYSTEM);
  await exports.referenceForm.getByRole('button', { name: 'Archived', exact: true }).click();
  await exports.editor.getByRole('combobox', { name: 'Scoped resource', exact: true }).click();
  await page.getByRole('option', { name: EXPORT_ARCHIVED_CUSTOMER_NAME, exact: true }).click();
  await expect(
    exports.editor.getByLabel('External resource reference', { exact: true }),
  ).toHaveValue('ERP-CUSTOMER-OLD');
  await exports.referenceForm.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(
    exports.editor.getByRole('combobox', { name: 'Scoped resource', exact: true }),
  ).toContainText(EXPORT_ARCHIVED_CUSTOMER_NAME);
  await exports.editor
    .getByLabel('External resource reference', { exact: true })
    .fill('ERP-CUSTOMER-REVISED');
  await exports.referenceForm
    .getByRole('button', { name: 'Save reviewed reference', exact: true })
    .click();
  await expect(exports.editor).toBeHidden();
  expect(state.customerQueries).toContain('true');
  expect(state.reference).toMatchObject({
    resourceType: 'customer',
    resourceId: EXPORT_ARCHIVED_CUSTOMER_ID,
    revision: 2,
    reference: 'ERP-CUSTOMER-REVISED',
  });
  expect(state.mappingAttempts).toHaveLength(1);
  expect(state.mappingAttempts[0]?.ifMatch).toBe('"revision-1"');
  await expect(exports.workspace).not.toContainText('Private billing contact');
});

test('recovers one archive, preserves original download bytes and appends a separately acknowledged ERP adjustment', async ({
  page,
}, info) => {
  const state = await installMaintenanceExports(page, { loseCreateReply: true });
  const exports = new MaintenanceExportsPage(page);
  await exports.goto();
  await expect(
    page.getByRole('heading', { name: 'No retained export yet', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await exports.prepareExport();
  await expect(
    exports.editor.getByLabel('Include internal costs in this private export', { exact: true }),
  ).toHaveCount(0);
  await exports.capture(info, 'published-source-selection-with-blocked-history');
  await exports.generate();
  await expect(exports.recover).toBeVisible();
  await exports.recover.click();
  await expect(exports.editor).toBeHidden();
  expect(state.createAttempts).toHaveLength(2);
  expect(state.createAttempts[1]).toEqual(state.createAttempts[0]);
  expect(state.committedArchives).toBe(1);
  expect(state.createAttempts[0]?.includeInternalCosts).toBe(false);
  await expect(exports.detail).toContainText('No external import has been confirmed');
  await expect(
    page.getByTestId('maintenance-export-archives').getByText('Private costs', { exact: true }),
  ).toHaveCount(0);
  const originalMetadata = state.archives.get(EXPORT_INITIAL_ID);
  const originalJson = await exports.download('JSON');
  const originalCsv = await exports.download('CSV');
  expect(originalJson.toString()).toBe(state.files.get(EXPORT_INITIAL_ID)?.json);
  expect(originalCsv.toString()).toBe(state.files.get(EXPORT_INITIAL_ID)?.csv);
  expect(originalJson.toString()).toContain('ERP-SITE-OLD');
  await exports.mapSite('ERP-SITE-CORRECTED');
  expect(state.mappingAttempts[0]?.ifMatch).toBe('"revision-1"');
  expect(state.reference.revision).toBe(2);
  expect(await exports.download('JSON')).toEqual(originalJson);
  await exports.prepareAdjustment(
    'Validated correction following the supplier return and external reference review',
  );
  await exports.capture(info, 'append-linked-adjustment');
  await exports.generateAdjustment();
  expect(state.adjustmentAttempts[0]?.ifMatch).toBe('"revision-1"');
  expect(state.archives.get(EXPORT_ADJUSTMENT_ID)).toMatchObject({
    adjustmentOf: EXPORT_INITIAL_ID,
    originalExportId: EXPORT_INITIAL_ID,
    state: 'generated',
  });
  expect(state.archives.get(EXPORT_INITIAL_ID)).toEqual(originalMetadata);
  const adjustmentJson = await exports.download('JSON');
  expect(adjustmentJson.toString()).toContain('ERP-SITE-CORRECTED');
  expect(adjustmentJson.toString()).toContain(EXPORT_INITIAL_ID);
  expect(adjustmentJson).not.toEqual(originalJson);
  await exports.prepareConfirmation('ERP-IMPORT-2026-0041');
  await exports.capture(info, 'explicit-actual-import-reference');
  await exports.confirmImport();
  await expect(exports.detail).toContainText('External import confirmed');
  await expect(exports.detail).toContainText('ERP-IMPORT-2026-0041');
  expect(state.confirmAttempts[0]).toMatchObject({
    exportId: EXPORT_ADJUSTMENT_ID,
    ifMatch: '"revision-1"',
    body: { externalImportReference: 'ERP-IMPORT-2026-0041' },
  });
  expect(await exports.download('JSON')).toEqual(adjustmentJson);
  expect(state.archives.get(EXPORT_INITIAL_ID)).toEqual(originalMetadata);
  await exports.detail.getByRole('link', { name: 'Open original export', exact: true }).click();
  await expect(exports.detail).toContainText('No external import has been confirmed');
  expect(await exports.download('CSV')).toEqual(originalCsv);
  expect(state.committedArchives).toBe(2);
  await exports.capture(info, 'original-bytes-retained-after-confirmed-adjustment');
});

test('allows dedicated financial readers to download private archives without exposing management or import-confirmation controls', async ({
  page,
}, info) => {
  const state = await installMaintenanceExports(page, { finance: true, readOnly: true });
  const exports = new MaintenanceExportsPage(page);
  await exports.goto(EXPORT_PRIVATE_ID);
  await expect(exports.detail).toContainText('Private archive including internal costs');
  await expect(page.getByTestId('maintenance-export-create')).toHaveCount(0);
  await expect(
    exports.detail.getByRole('button', { name: 'Append adjustment', exact: true }),
  ).toHaveCount(0);
  await expect(
    exports.detail.getByRole('button', { name: 'Confirm external import', exact: true }),
  ).toHaveCount(0);
  const bytes = await exports.download('JSON');
  expect(bytes.toString()).toBe(state.files.get(EXPORT_PRIVATE_ID)?.json);
  expect(bytes.toString()).toContain('"internalCost":"12.123456"');
  expect(state.createAttempts).toHaveLength(0);
  expect(state.confirmAttempts).toHaveLength(0);
  await exports.capture(info, 'private-retained-archive-with-read-only-financial-rights');
});
