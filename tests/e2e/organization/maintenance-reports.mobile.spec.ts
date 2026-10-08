import { expect, test, type Locator } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectMinimumCssPixels,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import {
  LONG_ALLOCATION_NAME,
  LONG_CUSTOMER_NAME,
  LONG_SITE_NAME,
  MAINTENANCE_REPORTS_URL,
  OTHER_DOSSIER_NAME,
  REPORT_CUSTOMER_ID,
  REPORT_EQUIPMENT_ID,
  REPORT_INTERVENTION_ID,
  REPORT_SITE_ID,
  SOURCE_DOSSIER_NAME,
  captureMaintenanceReport,
  installMaintenanceReports,
} from '../support/helpers/maintenance-reports';

/** Critical finance actions retain a real 44px phone target before receiving touch input. */
async function tapFinancialAction(action: Locator): Promise<void> {
  await action.scrollIntoViewIfNeeded();
  const bounds = await action.boundingBox();
  if (!bounds) throw new Error('The financial action must be visible on the phone.');
  expectMinimumCssPixels(bounds.height, 44);
  expectMinimumCssPixels(bounds.width, 44);
  await action.tap();
}

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

test.describe('Private economic pilotage with native phone interactions', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`keeps exact amounts, unknown valuations and named source navigation readable with financial read alone in ${theme} mode`, async ({
      page,
      context,
      baseURL,
    }, info) => {
      test.setTimeout(60_000);
      const errors = collectConsoleErrors(page);
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const state = await installMaintenanceReports(page, { incomplete: true, compact: true });
      await page.goto(MAINTENANCE_REPORTS_URL);
      await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
      const reportPage = page.getByTestId('maintenance-reports-page');
      await expect(reportPage).toBeVisible();
      const totals = page.getByTestId('maintenance-report-totals');
      await expect(totals.getByTestId('maintenance-report-current')).toHaveText('Unknown');
      await expect(totals.getByTestId('maintenance-report-frozen')).toHaveText('Unknown');
      await expect(totals.getByTestId('maintenance-report-variance')).toHaveText('Unknown');
      await expect(totals).toContainText('9,007,199,254,741,018.123456 EUR');
      await expect(page.getByTestId('maintenance-report-missing-snapshot')).toContainText(
        'Published dossiers without an immutable closure snapshot: 1.',
      );
      expect(state.directoryRequests).toHaveLength(0);
      expect(state.operationalRequests).toEqual([]);

      const allocatedCards = page.getByTestId('maintenance-report-cards').first();
      await expect(allocatedCards).toBeVisible();
      await expect(allocatedCards.getByRole('listitem')).toHaveCount(2);
      const namedAllocation = allocatedCards.getByRole('listitem').filter({
        has: page.getByRole('heading', { name: LONG_ALLOCATION_NAME, exact: true }),
      });
      await expect(namedAllocation).toContainText('9,007,199,254,740,993.123456 EUR');
      await expect(namedAllocation).toContainText('8.000000 EUR');
      await expectNoInternalOverflow(namedAllocation);
      await Promise.all(
        (await namedAllocation.locator('dd').all()).map((amount) =>
          expectNoInternalOverflow(amount),
        ),
      );
      await namedAllocation.scrollIntoViewIfNeeded();
      await captureMaintenanceReport(page, info, `phone-${theme}-exact-allocation`);

      const incompleteAllocation = allocatedCards.getByRole('listitem').nth(1);
      await expect(incompleteAllocation).toContainText('Unknown');
      await expect(incompleteAllocation).toContainText('Known subtotal');
      await expect(incompleteAllocation).toContainText('20.000000 EUR');
      await expect(incompleteAllocation).toContainText('Unvalued contributions: 1');
      await expectNoInternalOverflow(incompleteAllocation);
      const unallocated = page.getByTestId('maintenance-report-unallocated');
      await expect(
        unallocated.getByRole('heading', { name: 'Unallocated costs', exact: true }),
      ).toBeVisible();
      await expect(
        unallocated
          .getByTestId('maintenance-report-cards')
          .getByText('5.000000 EUR', { exact: true }),
      ).toHaveCount(1);
      await expect(unallocated).toContainText('100.000000 EUR');
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(reportPage);
      await expectNoInternalOverflow(unallocated);

      await tapFinancialAction(
        namedAllocation.getByRole('button', { name: 'View source dossiers', exact: true }),
      );
      const sources = page
        .getByRole('dialog', { name: 'Source financial dossiers', exact: true })
        .locator('hlm-sheet-content');
      await expect(sources).toBeVisible();
      await expect(sources).toContainText(SOURCE_DOSSIER_NAME);
      await expect(sources.getByText(OTHER_DOSSIER_NAME, { exact: false })).toHaveCount(0);
      const sourceLink = sources.getByRole('link', { name: 'Open financial dossier', exact: true });
      await expect(sourceLink).toHaveCount(1);
      await expect(sourceLink).toHaveAttribute(
        'href',
        `/organizations/${E2E_ORGANIZATION_ID}/maintenance-costs?interventionId=${REPORT_INTERVENTION_ID}`,
      );
      const sourceLinkBounds = await sourceLink.boundingBox();
      if (!sourceLinkBounds) throw new Error('The selected financial dossier must be reachable.');
      expectMinimumCssPixels(sourceLinkBounds.height, 44);
      await expectNoInternalOverflow(sources);
      expect(state.directoryRequests).toHaveLength(0);
      await captureMaintenanceReport(page, info, `phone-${theme}-exact-source-subset`);
      await tapFinancialAction(sources.getByRole('button', { name: 'Close', exact: true }));
      await expect(sources).toBeHidden();

      await tapFinancialAction(
        page.getByRole('button', {
          name: 'Browse financial dossiers and choose a scope',
          exact: true,
        }),
      );
      const directory = page.getByTestId('maintenance-financial-directory');
      await expect(directory).toBeVisible();
      await expect.poll(() => state.directoryRequests.length).toBe(1);
      const search = directory.getByLabel('Work reference or name', { exact: true });
      await search.tap();
      await search.fill('Entrance');
      await tapFinancialAction(
        directory.getByRole('button', { name: 'Search dossiers', exact: true }),
      );
      await expect.poll(() => state.directoryRequests.at(-1)?.['search']).toBe('Entrance');
      const directoryItems = directory.getByTestId('maintenance-financial-items');
      await expect(directoryItems.getByRole('listitem')).toHaveCount(1);
      const dossierEntry = directoryItems.getByRole('listitem');
      await expect(dossierEntry).toContainText(LONG_SITE_NAME);
      await expect(dossierEntry).toContainText(LONG_CUSTOMER_NAME);
      await expectNoInternalOverflow(directory);
      await expectNoInternalOverflow(dossierEntry);
      await dossierEntry.scrollIntoViewIfNeeded();
      await captureMaintenanceReport(page, info, `phone-${theme}-named-directory`);
      await tapFinancialAction(
        dossierEntry.getByRole('button', { name: /^Limit to equipment\s*:\s*EX-001\b/ }),
      );
      await expect
        .poll(() => state.reportRequests.at(-1)?.['equipmentId'])
        .toBe(REPORT_EQUIPMENT_ID);
      expect(state.reportRequests.at(-1)).toMatchObject({
        equipmentId: REPORT_EQUIPMENT_ID,
        siteId: REPORT_SITE_ID,
        customerId: REPORT_CUSTOMER_ID,
        groupBy: 'equipment',
        page: '1',
      });
      const filters = page.getByTestId('maintenance-report-filter-form');
      await expect(filters).toContainText(LONG_SITE_NAME);
      await expect(filters).toContainText(LONG_CUSTOMER_NAME);
      await expect(filters).toContainText('EX-001');
      await tapFinancialAction(filters.getByRole('button', { name: 'Site', exact: true }));
      await tapFinancialAction(
        filters.getByRole('button', { name: 'Read economic report', exact: true }),
      );
      await expect.poll(() => state.reportRequests.at(-1)?.['groupBy']).toBe('site');
      expect(state.reportRequests.at(-1)).toMatchObject({
        equipmentId: REPORT_EQUIPMENT_ID,
        siteId: REPORT_SITE_ID,
        customerId: REPORT_CUSTOMER_ID,
      });
      await expectNoInternalOverflow(filters);
      await filters.scrollIntoViewIfNeeded();
      await captureMaintenanceReport(page, info, `phone-${theme}-named-filters`);

      await tapFinancialAction(
        namedAllocation.getByRole('button', { name: 'View source dossiers', exact: true }),
      );
      await expect(sources).toBeVisible();
      await tapFinancialAction(
        sources.getByRole('link', { name: 'Open financial dossier', exact: true }),
      );
      await expect(page).toHaveURL(
        new RegExp(`maintenance-costs\\?interventionId=${REPORT_INTERVENTION_ID}$`),
      );
      await expect(page.getByTestId('maintenance-current-total')).toHaveText('Unknown');
      expect(state.privateDossierRequests).toHaveLength(1);
      expect(state.operationalRequests).toEqual([]);
      await expect(page.getByRole('link', { name: 'Open intervention', exact: true })).toHaveCount(
        0,
      );
      await expect(page.getByTestId('maintenance-planning-form')).toHaveCount(0);
      await expect(page.getByTestId('maintenance-expense-form')).toHaveCount(0);
      expect(errors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});
