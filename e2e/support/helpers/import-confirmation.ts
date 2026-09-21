import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../fixtures/api-fixtures';
import { importJobOutput } from '../fixtures/import-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { ImportsPage } from '../pages/imports.page';
import { expectNoHorizontalOverflow } from './appearance';

/** Covers template, simulation, lost confirmation response and the same final import report. */
export async function verifyImportConfirmation(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const simulated = importJobOutput({
    id: 'simulation',
    kind: 'facility',
    dryRun: true,
    canConfirm: true,
    originalFilename: 'site.csv',
    totalRows: 1,
    processedRows: 1,
    successfulRows: 1,
    errorReport: [
      { rowNumber: 1, code: 'would_create', message: 'Site would be created.', column: null },
    ],
  });
  const real = importJobOutput({
    ...simulated,
    id: 'real-import',
    dryRun: false,
    canConfirm: false,
    errorReport: [],
  });
  let uploads = 0;
  let confirms = 0;
  let confirmed = false;
  await page.route(new RegExp('/api/imports(\\?.*)?$'), async (route) => {
    if (route.request().method() === 'POST') {
      uploads++;
      expect(route.request().postData()).toContain('name="dryRun"');
      expect(route.request().postData()).toContain('true');
      await route.fulfill({
        status: 202,
        json: {
          ...simulated,
          status: 'pending',
          canConfirm: false,
          processedRows: 0,
          successfulRows: 0,
          errorReport: [],
        },
      });
    } else {
      await route.fulfill({
        json: hydraCollection(
          uploads
            ? [{ ...simulated, canConfirm: !confirmed, confirmedJobId: confirmed ? real.id : null }]
            : [],
        ),
      });
    }
  });
  await page.route('**/api/imports/simulation', (route) =>
    route.fulfill({
      json: { ...simulated, canConfirm: !confirmed, confirmedJobId: confirmed ? real.id : null },
    }),
  );
  await page.route('**/api/imports/real-import', (route) => route.fulfill({ json: real }));
  await page.route('**/api/imports/simulation/confirm', async (route) => {
    confirms++;
    confirmed = true;
    if (confirms === 1) await route.abort('failed');
    else await route.fulfill({ status: 202, json: real });
  });
  await page.route(
    `**/api/organizations/${E2E_ORGANIZATION_ID}/import-templates/facility`,
    (route) =>
      route.fulfill({
        json: {
          '@id': '/template',
          '@type': 'ImportTemplate',
          filename: 'fireguard-facility-template.csv',
          content: 'type,name,code,address,latitude,longitude,parentCode\r\n',
          mediaType: 'text/csv;charset=utf-8',
        },
      }),
  );
  const imports = new ImportsPage(page);
  await imports.goto(E2E_ORGANIZATION_ID);
  await page.getByRole('combobox', { name: 'Import type' }).click();
  await page.getByRole('option', { name: 'Facilities', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByTestId('import-template-download').click();
  expect((await downloaded).suggestedFilename()).toBe('fireguard-facility-template.csv');
  await page.getByTestId('import-upload-file-input').setInputFiles({
    name: 'site.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('type,name\nsite,HQ\n'),
  });
  await expect(page.getByTestId('import-upload-submit')).toContainText('Simulate import');
  await page.getByTestId('import-upload-submit').click();
  await expect(imports.report).toBeVisible();
  const confirm = page.getByTestId('import-confirm');
  await expect(confirm).toBeVisible();
  await expect(page.getByText('Loading the latest report…', { exact: true })).toHaveCount(0);
  await expect(imports.summary).toContainText('no data was written');
  await confirm.focus();
  await page.keyboard.press('Enter');
  await expect(imports.report).toContainText('could not be confirmed');
  await expect(imports.summary).toContainText('no data was written');
  await expectNoHorizontalOverflow(page);
  const base = `e2e/artifacts/reliability/import-confirm-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({ path: `${base}-retry.png`, fullPage: true, animations: 'disabled' });
  await confirm.click();
  await expect(imports.summary).toHaveText('1 row(s) created.');
  await expect(confirm).toHaveCount(0);
  expect(uploads).toBe(1);
  expect(confirms).toBe(2);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${base}-complete.png`, fullPage: true, animations: 'disabled' });
}
