import { expect, test } from '@playwright/test';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
} from '../support/helpers/appearance';
import {
  captureMaintenanceReport,
  installMaintenanceReports,
  LONG_ALLOCATION_NAME,
  LONG_SITE_NAME,
  MAINTENANCE_REPORTS_URL,
  OTHER_DOSSIER_NAME,
  REPORT_EQUIPMENT_ID,
  REPORT_INTERVENTION_ID,
  REPORT_SITE_ID,
  SOURCE_DOSSIER_NAME,
} from '../support/helpers/maintenance-reports';

test.describe('Private maintenance economic reports', () => {
  test('keeps exact full-filter totals independent of destination pages and counts general work once', async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    const errors = collectConsoleErrors(page);
    const state = await installMaintenanceReports(page);
    await page.goto(MAINTENANCE_REPORTS_URL);
    await expect(page.getByTestId('maintenance-report-current')).toHaveText(
      '9,007,199,254,741,018.123456 EUR',
    );
    await expect(page.getByTestId('maintenance-report-budget')).toHaveText('100.000000 EUR');
    const allocations = page.getByTestId('maintenance-report-table').first();
    await expect(allocations.getByTestId('maintenance-report-row-count')).toHaveText(
      '30 of 31 rows shown',
    );
    await expect(
      allocations.getByTestId('maintenance-report-grid').locator('tbody tr'),
    ).toHaveCount(30);
    const unallocated = page.getByTestId('maintenance-report-unallocated');
    await expect(
      unallocated.getByTestId('maintenance-report-grid').locator('tbody tr'),
    ).toHaveCount(1);
    await expect(unallocated.getByTestId('maintenance-report-grid')).toContainText('5.000000 EUR');
    expect(state.directoryRequests).toEqual([]);
    await page.getByTestId('maintenance-report-current').scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(page.getByTestId('maintenance-reports-page'));
    await expectNoInternalOverflow(allocations.getByTestId('maintenance-report-grid'));
    await captureMaintenanceReport(page, info, 'full-filter-exact-totals');
    const firstRow = allocations.getByTestId('maintenance-report-grid').locator('tbody tr').first();
    await firstRow.scrollIntoViewIfNeeded();
    await Promise.all((await firstRow.getByRole('cell').all()).map(expectNoInternalOverflow));
    await captureMaintenanceReport(page, info, 'allocation-exact-columns');
    await allocations.getByTestId('maintenance-report-page-next').click();
    await expect.poll(() => state.reportRequests.at(-1)?.['page']).toBe('2');
    await expect(allocations.getByTestId('maintenance-report-row-count')).toHaveText(
      '1 of 31 rows shown',
    );
    await expect(
      allocations.getByTestId('maintenance-report-grid').locator('tbody tr'),
    ).toHaveCount(1);
    await expect(page.getByTestId('maintenance-report-current')).toHaveText(
      '9,007,199,254,741,018.123456 EUR',
    );
    expect(state.reportRequests.at(-1)).toMatchObject({
      page: '2',
      itemsPerPage: '30',
      groupBy: 'equipment',
    });
    expect(state.operationalRequests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('keeps unknown valuations and missing historical closure separate from known current contributions', async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const state = await installMaintenanceReports(page, { incomplete: true, compact: true });
    await page.goto(MAINTENANCE_REPORTS_URL);
    await expect(page.getByTestId('maintenance-report-current')).toHaveText('Unknown');
    await expect(page.getByTestId('maintenance-report-totals')).toContainText(
      'Known: 9,007,199,254,741,018.123456 EUR',
    );
    await expect(page.getByTestId('maintenance-report-frozen')).toHaveText('Unknown');
    await expect(page.getByTestId('maintenance-report-missing-snapshot')).toContainText(
      'Published dossiers without an immutable closure snapshot: 1',
    );
    await expect(
      page.getByRole('heading', { name: 'Some valuations are unknown', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('maintenance-report-unallocated')).toContainText('5.000000 EUR');
    await expect(page.getByTestId('maintenance-report-procurement')).toContainText(
      'independently of equipment, site or customer filters',
    );
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(page.getByTestId('maintenance-reports-page'));
    await captureMaintenanceReport(page, info, 'incomplete-and-historical-closure');
    expect(state.operationalRequests).toEqual([]);
  });

  test('applies inclusive dates grouping and named scopes through the paginated financial directory alone', async ({
    page,
  }, info) => {
    const state = await installMaintenanceReports(page);
    await page.goto(MAINTENANCE_REPORTS_URL);
    const form = page.getByTestId('maintenance-report-filter-form');
    await form.getByLabel('From', { exact: true }).fill('2025-01-01');
    await form.getByLabel('Through', { exact: true }).fill('2025-01-31');
    await form.getByRole('button', { name: 'Site', exact: true }).click();
    await form.getByRole('button', { name: 'Read economic report', exact: true }).click();
    await expect
      .poll(() => state.reportRequests.at(-1))
      .toMatchObject({
        from: '2025-01-01',
        to: '2025-01-31',
        groupBy: 'site',
        page: '1',
        itemsPerPage: '30',
      });
    await page
      .getByRole('button', { name: 'Browse financial dossiers and choose a scope', exact: true })
      .click();
    const directory = page.getByTestId('maintenance-financial-directory');
    await expect(directory.getByTestId('maintenance-financial-row-count')).toHaveText(
      '30 of 31 rows shown',
    );
    await directory.getByTestId('maintenance-financial-page-next').click();
    await expect.poll(() => state.directoryRequests.at(-1)?.['page']).toBe('2');
    await expect(directory.getByTestId('maintenance-financial-row-count')).toHaveText(
      '1 of 31 rows shown',
    );
    await directory.getByLabel('Work reference or name', { exact: true }).fill('Entrance');
    await directory.getByRole('button', { name: 'Search dossiers', exact: true }).click();
    await expect
      .poll(() => state.directoryRequests.at(-1))
      .toMatchObject({ page: '1', search: 'Entrance' });
    await expect(
      directory.getByRole('heading', { name: `1 · ${SOURCE_DOSSIER_NAME}`, exact: true }),
    ).toBeVisible();
    await directory
      .getByRole('button', { name: new RegExp(`^Limit to site\\s*:\\s*${LONG_SITE_NAME}$`) })
      .click();
    await expect.poll(() => state.reportRequests.at(-1)?.['siteId']).toBe(REPORT_SITE_ID);
    await expect(form).toContainText(LONG_SITE_NAME);
    await directory.getByRole('button', { name: /^Limit to equipment\s*:\s*EX-001\b/ }).click();
    await expect.poll(() => state.reportRequests.at(-1)?.['equipmentId']).toBe(REPORT_EQUIPMENT_ID);
    await expect(form).toContainText('EX-001');
    await form.getByRole('button', { name: 'Clear all named filters', exact: true }).click();
    await expect.poll(() => state.reportRequests.at(-1)?.['equipmentId']).toBeUndefined();
    await expect(
      form.getByRole('button', { name: 'Clear all named filters', exact: true }),
    ).toHaveCount(0);
    await form.scrollIntoViewIfNeeded();
    await captureMaintenanceReport(page, info, 'named-financial-scope');
    expect(state.operationalRequests).toEqual([]);
  });

  test('refuses an oversized date window even with a named scope and recovers with shorter inclusive dates', async ({
    page,
  }, info) => {
    const state = await installMaintenanceReports(page, { refuseBroad: true, compact: true });
    await page.goto(MAINTENANCE_REPORTS_URL);
    const error = page.getByTestId('maintenance-report-error');
    await expect(error).toContainText('More than 500 source dossiers');
    await expect(error).toContainText('No partial total is displayed');
    await expect(page.getByTestId('maintenance-report-totals')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Browse financial dossiers and choose a scope', exact: true })
      .click();
    const directory = page.getByTestId('maintenance-financial-directory');
    await directory
      .getByRole('button', { name: new RegExp(`^Limit to site\\s*:\\s*${LONG_SITE_NAME}$`) })
      .first()
      .click();
    await expect.poll(() => state.reportRequests.at(-1)?.['siteId']).toBe(REPORT_SITE_ID);
    await expect(error).toContainText('More than 500 source dossiers');
    await expect(page.getByTestId('maintenance-report-totals')).toHaveCount(0);
    const form = page.getByTestId('maintenance-report-filter-form');
    await form.getByLabel('From', { exact: true }).fill('2025-01-25');
    await form.getByLabel('Through', { exact: true }).fill('2025-01-31');
    await form.getByRole('button', { name: 'Read economic report', exact: true }).click();
    await expect
      .poll(() => state.reportRequests.at(-1))
      .toMatchObject({ from: '2025-01-25', to: '2025-01-31', siteId: REPORT_SITE_ID });
    await expect(error).toHaveCount(0);
    await expect(page.getByTestId('maintenance-report-current')).toHaveText(
      '9,007,199,254,741,018.123456 EUR',
    );
    await page.getByTestId('maintenance-report-current').scrollIntoViewIfNeeded();
    await captureMaintenanceReport(page, info, 'oversized-scope-recovered');
    expect(state.operationalRequests).toEqual([]);
  });

  test('opens only the exact allocation source dossier using financial read permission and no extra identity lookup', async ({
    page,
  }, info) => {
    const errors = collectConsoleErrors(page);
    const state = await installMaintenanceReports(page, { compact: true });
    await page.goto(MAINTENANCE_REPORTS_URL);
    const allocation = page.getByTestId('maintenance-report-table').first();
    const card = allocation
      .getByRole('row')
      .filter({ hasText: LONG_ALLOCATION_NAME })
      .or(allocation.getByRole('listitem').filter({ hasText: LONG_ALLOCATION_NAME }))
      .filter({ visible: true });
    await card.getByRole('button', { name: 'View source dossiers', exact: true }).click();
    const sheet = page
      .getByRole('dialog', { name: 'Source financial dossiers', exact: true })
      .locator('hlm-sheet-content');
    await expect(sheet).toContainText(SOURCE_DOSSIER_NAME);
    await expect(sheet).not.toContainText(OTHER_DOSSIER_NAME);
    const link = sheet.getByRole('link', { name: 'Open financial dossier', exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute(
      'href',
      new RegExp(`interventionId=${REPORT_INTERVENTION_ID}$`),
    );
    expect(state.directoryRequests).toEqual([]);
    expect(state.privateDossierRequests).toEqual([]);
    await expectNoInternalOverflow(sheet);
    await captureMaintenanceReport(page, info, 'exact-named-source-sheet');
    await link.click();
    await expect.poll(() => state.privateDossierRequests.length).toBe(1);
    await expect(
      page.getByRole('heading', { name: 'Maintenance costs', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('maintenance-expense-form')).toHaveCount(0);
    await expect(page).toHaveURL(
      new RegExp(`/maintenance-costs\\?interventionId=${REPORT_INTERVENTION_ID}$`),
    );
    expect(state.operationalRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
});
