import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { inspectionsChannelOutput } from '../support/fixtures/channel-fixtures';
import {
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  organizationDashboardOutput,
} from '../support/fixtures/dashboard-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { ChannelsPage } from '../support/pages/channels.page';
import { OrganizationDashboardPage } from '../support/pages/organization-dashboard.page';

for (const [width, dark] of [
  [1562, true],
  [1440, false],
  [375, true],
] as const) {
  test(
    'dashboard charts and channel dialog fit ' + width + 'px',
    async ({ page, context, baseURL }) => {
      await page.setViewportSize({ width, height: 938 });
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const errors = collectConsoleErrors(page);
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockOrganizationDashboard(E2E_ORGANIZATION_ID, organizationDashboardOutput());
      await api.mockDashboardInspectionsTrend(E2E_ORGANIZATION_ID, inspectionsTrendOutput());
      await api.mockDashboardNonConformitiesOpenedTrend(
        E2E_ORGANIZATION_ID,
        nonConformitiesOpenedTrendOutput(),
      );
      await api.mockDashboardNonConformitiesResolvedTrend(
        E2E_ORGANIZATION_ID,
        nonConformitiesResolvedTrendOutput(),
      );
      await api.mockDashboardEquipmentCreatedTrend(
        E2E_ORGANIZATION_ID,
        equipmentCreatedTrendOutput(),
      );
      await api.mockDashboardFacilitiesCreatedTrend(
        E2E_ORGANIZATION_ID,
        facilitiesCreatedTrendOutput(),
      );
      const dashboard = new OrganizationDashboardPage(page);
      await dashboard.goto(E2E_ORGANIZATION_ID);
      await expect(dashboard.kpiSection.locator('app-stat-tile')).toHaveCount(4);
      await expect(dashboard.root.locator('tanstack-chart svg')).toHaveCount(4);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: 'e2e/artifacts/dashboard-summary-' + width + '.png',
        animations: 'disabled',
      });
      await dashboard.inspectionsChartCard.screenshot({
        path: 'e2e/artifacts/dashboard-chart-' + width + '.png',
        animations: 'disabled',
      });
      const svg = dashboard.chartSvg(dashboard.inspectionsChartCard);
      await svg.focus();
      await page.keyboard.press('ArrowRight');
      await expect(dashboard.inspectionsChartCard.getByRole('status')).toBeVisible();
      await page.screenshot({
        path: 'e2e/artifacts/dashboard-tooltip-' + width + '.png',
        animations: 'disabled',
      });
      await api.mockChannelList([inspectionsChannelOutput()]);
      const channels = new ChannelsPage(page);
      await channels.goto(E2E_ORGANIZATION_ID);
      await channels.openChannelCreateDialog();
      await expect(channels.newDialog).toBeVisible();
      await expect(channels.newDialog).toHaveAttribute('data-slot', 'dialog-content');
      const bounds = await channels.newDialog.boundingBox();
      if (!bounds) throw new Error('Missing dialog bounds');
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.width).toBeGreaterThanOrEqual(Math.min(width - 48, 400));
      expect(Math.abs(bounds.x + bounds.width / 2 - width / 2)).toBeLessThanOrEqual(2);
      await expect(channels.newNameInput).toBeFocused();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: 'e2e/artifacts/channel-create-dialog-' + width + '.png',
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await expect(channels.newDialog).toBeHidden();
      expect(errors).toEqual([]);
    },
  );
}
