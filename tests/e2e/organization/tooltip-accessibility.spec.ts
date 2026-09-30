import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, notificationOutput } from '../support/fixtures/api-fixtures';
import {
  complianceFacilityTreeOutput,
  complianceSummaryOutput,
} from '../support/fixtures/compliance-fixtures';
import {
  organizationDashboardOutput,
  organizationDashboardRecentInterventionOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
} from '../support/fixtures/dashboard-fixtures';
import { equipmentOutput, E2E_EQUIPMENT_ID } from '../support/fixtures/equipment-fixtures';
import { facilityOutput, E2E_FACILITY_ID } from '../support/fixtures/facility-fixtures';
import {
  interventionOutput,
  interventionLabelOutput,
  interventionRecurrenceOutput,
  interventionTemplateOutput,
} from '../support/fixtures/intervention-fixtures';
import { maintenanceScheduleOutput } from '../support/fixtures/maintenance-fixtures';
import { expectAccessibleTooltip } from '../support/helpers/accessibility-evidence';
import { arrangeInterventionTables } from '../support/helpers/intervention-detail-tables';
import { ApiMock } from '../support/mocks/api-mock';
import { AssetsExplorerPage } from '../support/pages/assets-explorer.page';
import { EquipmentsPage } from '../support/pages/equipments.page';
import { FacilitiesPage } from '../support/pages/facilities.page';
import { InterventionsPage } from '../support/pages/interventions.page';
import { MaintenanceSchedulesPage } from '../support/pages/maintenance-schedules.page';

test('exposes full notification and inbox timestamps to keyboard users', async ({ page }) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ notifications: [notificationOutput()] });
  await api.mockAccountVisualReads();
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
  await expect(page.locator('#dashboard-layout')).toBeVisible();
  await page.goto('/account/notifications');
  await expectAccessibleTooltip(
    page,
    page.getByTestId('inbox-item').locator('[tabindex="0"]'),
    'inbox-timestamp',
  );
  await page.getByTestId('account-notifications-tab-notifications').click();
  await expectAccessibleTooltip(
    page,
    page.locator('app-account-notification-list [tabindex="0"]'),
    'notification-timestamp',
  );
});

test('exposes full equipment and facility update timestamps without giving them button semantics', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, equipmentOutput());
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput());
  await new EquipmentsPage(page).gotoDetail(E2E_ORGANIZATION_ID, E2E_EQUIPMENT_ID);
  await expectAccessibleTooltip(
    page,
    page.getByTestId('equipment-detail-meta'),
    'equipment-timestamp',
  );
  await new FacilitiesPage(page).gotoDetail(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);
  await expectAccessibleTooltip(
    page,
    page.locator('app-facility-detail-page [tabindex="0"]').first(),
    'facility-timestamp',
  );
});

test('makes activity, comment, property and attachment timestamps keyboard discoverable', async ({
  page,
}) => {
  const intervention = interventionOutput();
  const timestamp = new Date();
  timestamp.setHours(12, 0, 0, 0);
  const createdAt = timestamp.toISOString();
  const url = await arrangeInterventionTables(page, true, async (api) => {
    await api.mockInterventionActivities(intervention.id, [
      {
        id: 'system-date',
        kind: 'system',
        event: 'created',
        actor: null,
        body: null,
        payload: null,
        createdAt,
      },
      {
        id: 'comment-date',
        kind: 'comment',
        event: 'comment',
        actor: null,
        body: 'Document the pressure test.',
        payload: null,
        createdAt,
      },
    ]);
    await api.mockInterventionAttachments(intervention.id, [
      {
        id: 'timestamp-file',
        fileName: 'pressure-test.pdf',
        mimeType: 'application/pdf',
        size: 4000,
        kind: 'file',
        revision: 1,
        uploadedAt: createdAt,
      },
    ]);
  });
  await page.goto(url);
  const times = page.getByTestId('intervention-activity-thread').locator('time[tabindex="0"]');
  await expect(times).toHaveCount(2);
  await expectAccessibleTooltip(page, times.nth(0), 'intervention-system-timestamp');
  await expectAccessibleTooltip(page, times.nth(1), 'intervention-comment-timestamp');
  await page.getByTestId('intervention-properties-details-trigger').click();
  await expectAccessibleTooltip(
    page,
    page.getByTestId('intervention-field-created').locator('[tabindex="0"]'),
    'intervention-created-timestamp',
  );
  await expectAccessibleTooltip(
    page,
    page.getByTestId('intervention-field-updated').locator('[tabindex="0"]'),
    'intervention-updated-timestamp',
  );
  await page.getByRole('tab', { name: /Attachments/ }).click();
  await expectAccessibleTooltip(
    page,
    page.getByTestId('intervention-attachment-row').locator('time'),
    'intervention-file-timestamp',
  );
});

test('discloses the proposed change instant from the desktop table using the keyboard', async ({
  page,
}) => {
  await page.goto(`${await arrangeInterventionTables(page)}?tab=changes`);
  await expectAccessibleTooltip(
    page,
    page.getByTestId('intervention-changes-table').locator('span[tabindex="0"]'),
    'intervention-change-table-timestamp',
  );
});

test('discloses recurrence instants from the keyboard', async ({ page }) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const labels = ['Compliance', 'North wing', 'Pressure test'].map((name, index) =>
    interventionLabelOutput({ id: `label-${index}`, name }),
  );
  await api.mockInterventionList(E2E_ORGANIZATION_ID, [interventionOutput({ labels })]);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, labels);
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, [interventionTemplateOutput()]);
  await api.mockInterventionRecurrenceList(E2E_ORGANIZATION_ID, [
    interventionRecurrenceOutput({ lastMaterializedAt: new Date().toISOString() }),
  ]);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  const interventions = new InterventionsPage(page);
  await interventions.goto(E2E_ORGANIZATION_ID);
  await interventions.openRecurrences();
  await expectAccessibleTooltip(
    page,
    interventions.recurrencesTable.locator('span[tabindex="0"]').filter({ visible: true }),
    'intervention-recurrence-timestamp',
  );
});

test('discloses maintenance evaluation and compliance freshness instants from the keyboard', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
  await api.mockMaintenanceScheduleList([
    maintenanceScheduleOutput({ evaluatedAt: new Date().toISOString() }),
  ]);
  await new MaintenanceSchedulesPage(page).goto(E2E_ORGANIZATION_ID);
  await expectAccessibleTooltip(
    page,
    page.locator('app-maintenance-schedule-table span[tabindex="0"]').filter({ visible: true }),
    'maintenance-evaluation',
  );
  await api.mockComplianceFacilityTree(E2E_ORGANIZATION_ID, complianceFacilityTreeOutput());
  await api.mockFacilityCompliance(
    E2E_ORGANIZATION_ID,
    E2E_FACILITY_ID,
    complianceSummaryOutput({ dataEvaluatedAt: new Date().toISOString() }),
  );
  const assets = new AssetsExplorerPage(page);
  await assets.goto(E2E_ORGANIZATION_ID);
  await assets.openComplianceAxis();
  await assets.selectComplianceSite('North Building');
  const freshness = page.getByTestId('assets-compliance-freshness').locator('[tabindex="0"]');
  await expect(freshness).toHaveCount(2);
  await expectAccessibleTooltip(page, freshness.nth(0), 'compliance-generated-timestamp');
  await expectAccessibleTooltip(page, freshness.nth(1), 'compliance-evaluated-timestamp');
});

test('discloses recent dashboard update instants from the keyboard', async ({ page }) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationDashboard(
    E2E_ORGANIZATION_ID,
    organizationDashboardOutput({
      recentInterventions: [organizationDashboardRecentInterventionOutput()],
    }),
  );
  await api.mockDashboardInspectionsTrend(E2E_ORGANIZATION_ID, inspectionsTrendOutput());
  await api.mockDashboardNonConformitiesOpenedTrend(
    E2E_ORGANIZATION_ID,
    nonConformitiesOpenedTrendOutput(),
  );
  await api.mockDashboardNonConformitiesResolvedTrend(
    E2E_ORGANIZATION_ID,
    nonConformitiesResolvedTrendOutput(),
  );
  await api.mockDashboardEquipmentCreatedTrend(E2E_ORGANIZATION_ID, equipmentCreatedTrendOutput());
  await api.mockDashboardFacilitiesCreatedTrend(
    E2E_ORGANIZATION_ID,
    facilitiesCreatedTrendOutput(),
  );
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}`);
  await expectAccessibleTooltip(
    page,
    page.getByTestId('org-dashboard-recent').locator('[tabindex="0"]'),
    'dashboard-recent-timestamp',
  );
});
