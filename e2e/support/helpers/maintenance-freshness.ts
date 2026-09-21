import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import {
  complianceFacilityTreeOutput,
  complianceSummaryOutput,
} from '../fixtures/compliance-fixtures';
import { E2E_FACILITY_ID, facilityOutput } from '../fixtures/facility-fixtures';
import { maintenanceScheduleOutput } from '../fixtures/maintenance-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { AssetsExplorerPage } from '../pages/assets-explorer.page';
import { MaintenanceSchedulesPage } from '../pages/maintenance-schedules.page';
import { expectNoHorizontalOverflow } from './appearance';

/** Verifies evaluation coverage and identical date filtering on list and downloaded CSV. */
export async function verifyMaintenanceFreshness(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
  await api.mockMaintenanceScheduleList([
    { ...maintenanceScheduleOutput(), evaluatedAt: null },
    {
      ...maintenanceScheduleOutput({ id: 'evaluated-schedule' }),
      evaluatedAt: '2026-09-20T08:00:00Z',
    },
  ]);
  await page.route(/\/maintenance\/schedules\/export(\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: 'text/csv',
      headers: { 'Content-Disposition': 'attachment; filename="maintenance.csv"' },
      body: 'id,equipment_id\nevaluated-schedule,equipment-1\n',
    });
  });
  const maintenance = new MaintenanceSchedulesPage(page);
  await maintenance.goto(E2E_ORGANIZATION_ID);
  await expect(maintenance.root).toContainText('Not yet evaluated');
  await expect(maintenance.root).toContainText('Evaluated');
  await maintenance.openFilters();
  await maintenance.addFilter('Due before');
  const filtered = page.waitForRequest(
    (request) =>
      /\/maintenance\/schedules\?/.test(request.url()) &&
      new URL(request.url()).searchParams.has('dueBefore'),
  );
  await page.getByRole('gridcell', { name: '15', exact: true }).first().click();
  const bound = new URL((await filtered).url()).searchParams.get('dueBefore');
  expect(bound).not.toBeNull();
  const exported = page.waitForRequest((request) =>
    /\/maintenance\/schedules\/export\?/.test(request.url()),
  );
  await page.getByTestId('maintenance-export').focus();
  await page.keyboard.press('Enter');
  expect(new URL((await exported).url()).searchParams.get('dueBefore')).toBe(bound);
  if (info.project.name === 'Mobile Chrome') {
    const lastCard = await page.getByTestId('maintenance-schedule-table-card').last().boundingBox();
    const pagination = await page.locator('app-collection-pagination').boundingBox();
    if (!lastCard || !pagination) throw new Error('Missing mobile maintenance card or pagination');
    expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(pagination.y);
  }
  await expectNoHorizontalOverflow(page);
  const capture = `e2e/artifacts/reliability/maintenance-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({ path: `${capture}.png`, fullPage: true, animations: 'disabled' });

  await api.mockComplianceFacilityTree(E2E_ORGANIZATION_ID, complianceFacilityTreeOutput());
  const summary = complianceSummaryOutput();
  await api.mockFacilityCompliance(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {
    ...summary,
    generatedAt: '2026-09-20T09:00:00Z',
    dataEvaluatedAt: '2026-09-20T08:00:00Z',
    totals: { ...summary.totals, unevaluatedEquipmentCount: 2 },
  });
  const assets = new AssetsExplorerPage(page);
  await assets.goto(E2E_ORGANIZATION_ID);
  await assets.openComplianceAxis();
  await assets.selectComplianceSite('North Building');
  await expect(page.getByTestId('assets-compliance-freshness')).toContainText('Oldest evaluation');
  await expect(page.getByTestId('assets-compliance-unevaluated')).toContainText('2');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${capture}-compliance.png`,
    fullPage: true,
    animations: 'disabled',
  });
}
