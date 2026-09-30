import type { Page } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
  notificationOutput,
} from '../fixtures/api-fixtures';
import { approvalRequestOutput, approvalActionTypeOutput } from '../fixtures/approval-fixtures';
import { auditEventOutput } from '../fixtures/audit-fixtures';
import {
  E2E_PLAN_PRICING,
  invoiceOutput,
  organizationQuotaOutput,
  organizationSubscriptionOutput,
  planOutput,
} from '../fixtures/billing-fixtures';
import {
  channelOutput,
  channelParticipantOutput,
  messageOutput,
  inspectorMessageOutput,
} from '../fixtures/channel-fixtures';
import {
  organizationDashboardOutput,
  organizationDashboardAlertOutput,
  organizationDashboardRecentInterventionOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
} from '../fixtures/dashboard-fixtures';
import { directConversationOutput } from '../fixtures/direct-messages-fixtures';
import {
  equipmentOutput,
  equipmentKpiOutput,
  equipmentAttachmentOutput,
  equipmentMaintenanceLogOutput,
  equipmentTagOutput,
  E2E_EQUIPMENT_ID,
} from '../fixtures/equipment-fixtures';
import {
  facilityOutput,
  facilityBuildingModelOutput,
  type FacilityOutputFixture,
} from '../fixtures/facility-fixtures';
import { importJobOutput } from '../fixtures/import-fixtures';
import {
  inspectionOutput,
  nonConformityStatisticsOutput,
  type InspectionOutputFixture,
} from '../fixtures/inspection-fixtures';
import { maintenanceScheduleOutput } from '../fixtures/maintenance-fixtures';
import {
  organizationMemberOutput,
  inspectorOrganizationMemberOutput,
} from '../fixtures/member-fixtures';
import {
  E2E_PERMISSION_CATALOG,
  organizationRoleOutput,
  ownerOrganizationRoleOutput,
} from '../fixtures/role-fixtures';
import { visualCatalogFixtures } from '../fixtures/visual-catalog-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { WorkloadApiMock } from '../mocks/workload-api-mock';
import { INTERACTION_MODE_INTERVENTIONS } from './interaction-mode';

/** A 1×1 transparent PNG, standing in for the OpenFreeMap sprite image — mirrors `facilities-map.spec.ts`. */
const BLANK_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/**
 * Function installOpenFreeMapStubs
 * @description Blocks every OpenFreeMap tile/glyph request and fulfils its sprite atlas with a
 * blank stand-in, so the facility-map visual capture stays hermetic. Replicates
 * `facilities-map.spec.ts`'s own route stubs rather than sharing them (single other consumer).
 * @access public
 * @since 1.0.0
 * @param {Page} page - Isolated test page before navigation.
 * @returns {Promise<void>} Tile/glyph requests blocked, sprite requests fulfilled.
 */
export async function installOpenFreeMapStubs(page: Page): Promise<void> {
  await page.route('**tiles.openfreemap.org**', (route) => route.abort());
  await page.route('**tiles.openfreemap.org/sprites/**.json', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**tiles.openfreemap.org/sprites/**.png', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(BLANK_PNG_BASE64, 'base64'),
    });
  });
}

/**
 * Function mockMobileVisualWorkspace
 * @description Composes fixture factories and bounded populated catalogs for read-only captures.
 * No business records are created; unsupported security/preference catalogs remain explicit limits.
 * @access public
 * @since 1.0.0
 * @param {Page} page - Isolated browser page before navigation.
 * @returns {Promise<void>} All endpoint families registered behind ApiMock's safety net.
 */
export async function mockMobileVisualWorkspace(page: Page): Promise<void> {
  const api = new ApiMock(page);
  const org = E2E_ORGANIZATION_ID;
  const catalogs = visualCatalogFixtures();
  await api.mockAuthenticatedSession({ notifications: [notificationOutput()], unreadCount: 1 });
  await api.mockOrganizationAccess(org, {
    permissions: [
      ...ALL_ORGANIZATION_PERMISSIONS,
      'organization.events.read',
      'organization.events.write',
      'organization.teams.read',
      'organization.teams.write',
    ],
  });
  await api.mockOrganizationMembers(
    org,
    [organizationMemberOutput(), inspectorOrganizationMemberOutput()],
    { filterByRole: true },
  );
  await api.mockOrganizationInvitations(org, []);
  await api.mockOrganizationTeams(org, catalogs.teams);
  await api.mockOrganizationRoles(org, [ownerOrganizationRoleOutput(), organizationRoleOutput()]);
  await api.mockOrganizationPermissions(org, E2E_PERMISSION_CATALOG);
  await api.mockOrganizationQuota(org, organizationQuotaOutput());
  await api.mockOrganizationLegalTypes();
  await api.mockOrganizationSubscription(org, organizationSubscriptionOutput());
  await api.mockOrganizationInvoices(org, [invoiceOutput()]);
  await api.mockBillingPricing(E2E_PLAN_PRICING);
  await api.mockPlans([planOutput()]);
  await api.mockOrganizationDashboard(
    org,
    organizationDashboardOutput({
      alerts: [
        organizationDashboardAlertOutput(),
        organizationDashboardAlertOutput({ code: 'equipment_under_maintenance', count: 3 }),
      ],
      recentInterventions: [
        organizationDashboardRecentInterventionOutput(),
        ...INTERACTION_MODE_INTERVENTIONS.map((intervention) =>
          organizationDashboardRecentInterventionOutput({
            id: intervention.id,
            name: intervention.name,
            number: intervention.number,
            status: intervention.status,
          }),
        ),
      ],
    }),
  );
  await api.mockDashboardInspectionsTrend(org, inspectionsTrendOutput());
  await api.mockDashboardNonConformitiesOpenedTrend(org, nonConformitiesOpenedTrendOutput());
  await api.mockDashboardNonConformitiesResolvedTrend(org, nonConformitiesResolvedTrendOutput());
  await api.mockDashboardEquipmentCreatedTrend(org, equipmentCreatedTrendOutput());
  await api.mockDashboardFacilitiesCreatedTrend(org, facilitiesCreatedTrendOutput());
  const facility: FacilityOutputFixture = facilityOutput();
  const facilityListRow: FacilityOutputFixture & { readonly equipmentCount: number } = {
    ...facility,
    equipmentCount: 12,
  };
  await api.mockFacilityList(org, [facilityListRow]);
  await api.mockFacilityDetail(org, facility);
  await api.mockFacilityOverview(org, facility.id, {
    equipment: [equipmentOutput()],
    inspections: [inspectionOutput()],
  });
  await installOpenFreeMapStubs(page);
  await api.mockFacilityMap(org, [facility]);
  await api.mockFacilityBuildingModel(org, facility.id, facilityBuildingModelOutput());
  await api.mockEquipmentList(org, [equipmentOutput()]);
  await api.mockEquipmentKpis(org, equipmentKpiOutput());
  await api.mockEquipmentDetail(org, equipmentOutput());
  await api.mockEquipmentAttachments(org, E2E_EQUIPMENT_ID, [equipmentAttachmentOutput()]);
  await api.mockEquipmentMaintenanceLogs(org, E2E_EQUIPMENT_ID, [equipmentMaintenanceLogOutput()]);
  await api.mockEquipmentTags(org, [equipmentTagOutput()]);
  const inspectionRow: InspectionOutputFixture & {
    readonly equipmentSerialNumber: string;
    readonly facilityName: string;
    readonly checklistName: string;
  } = {
    ...inspectionOutput(),
    equipmentSerialNumber: 'SN-2024-001',
    facilityName: facility.name,
    checklistName: 'Monthly extinguisher and evacuation-route inspection',
  };
  await api.mockInspectionList(org, [inspectionRow]);
  await api.mockInspectionDetail(org, inspectionRow);
  await api.mockNonConformityStatistics(org, nonConformityStatisticsOutput());
  await api.mockChecklistList(org, catalogs.checklists);
  await api.mockChecklistDetail(org, catalogs.checklists[0]);
  await api.mockCalendarFeed(org, catalogs.calendar);
  await api.mockApprovalRequestList(org, [approvalRequestOutput()]);
  await api.mockApprovalActionTypes([approvalActionTypeOutput()]);
  await api.mockAutomationPolicy(org, catalogs.automationPolicy);
  await api.mockAutomationRunList(org, catalogs.automationAttempts);
  await api.mockWebhookSubscriptionList(org, catalogs.webhookSubscriptions);
  await api.mockWebhookDeliveryList(org, 'e2e-visual-webhook', catalogs.webhookDeliveries);
  await api.mockAuditEventList(org, [auditEventOutput()]);
  await api.mockImportJobList([importJobOutput()]);
  await api.mockMaintenanceScheduleList([maintenanceScheduleOutput()]);
  await new WorkloadApiMock(page).projection();
  await api.mockInterventionList(org, INTERACTION_MODE_INTERVENTIONS);
  await api.mockInterventionLabels(org, []);
  await api.mockInterventionTemplates(org, []);
  await api.mockInterventionEquipmentTypes(org, []);
  /* eslint-disable no-await-in-loop -- Preserve explicit Playwright route registration order. */
  for (const intervention of INTERACTION_MODE_INTERVENTIONS) {
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionIssues(intervention.id, []);
    await api.mockInterventionWorkItems(intervention.id, []);
    await api.mockInterventionChanges(intervention.id, []);
    await api.mockInterventionActivities(intervention.id, []);
    await api.mockInterventionAttachments(intervention.id, []);
  }
  /* eslint-enable no-await-in-loop */
  const channel = channelOutput();
  const direct = directConversationOutput();
  await api.mockChannelList([channel]);
  await api.mockChannelDetail(channel);
  await api.mockChannelParticipants(channel.id, [channelParticipantOutput()]);
  await api.mockDirectConversationList([direct]);
  await api.mockConversationDetail(direct);
  await api.mockSavedMessages([
    messageOutput({
      conversation: `/api/conversations/${direct.id}`,
      isSaved: true,
      body: 'Saved inspection handover: review the north wing evacuation route before reopening.',
    }),
  ]);
  /* eslint-disable no-await-in-loop -- Install each conversation's endpoint family in a stable order. */
  for (const id of [channel.id, direct.id]) {
    await api.mockChannelMessages(id, [messageOutput(), inspectorMessageOutput()]);
    await api.mockConversationMarkRead(id);
    await api.mockChannelSubscription(id);
  }
  /* eslint-enable no-await-in-loop */
  await api.mockAccountVisualReads();
}
