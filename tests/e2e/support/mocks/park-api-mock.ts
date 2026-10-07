import type { Page } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
  hydraCollection,
  organizationOutput,
} from '../fixtures/api-fixtures';
import {
  organizationDashboardOutput,
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
} from '../fixtures/dashboard-fixtures';
import { equipmentOutput, E2E_EQUIPMENT_ID } from '../fixtures/equipment-fixtures';
import { facilityOutput } from '../fixtures/facility-fixtures';
import { inspectionOutput, E2E_INSPECTION_ID } from '../fixtures/inspection-fixtures';
import { ApiMock } from './api-mock';

export const CUSTOMER_ID = 'e2e-park-customer';
export const CUSTOMER_NAME = 'Harbor safety customer';
export const SITE_NAME = 'Harbor campus';

/** Captured scopes prove that counts, list pagination and site choices use the same server predicates. */
export interface ParkRequest {
  readonly path: string;
  readonly family: string | null;
  readonly customerId: string | null;
  readonly facilityId: string | null;
}

/** Installs exact GET overrides after the session mocks; every unrelated request keeps the safety net. */
export async function mockPark(
  page: Page,
  profile: 'operator' | 'service_provider',
): Promise<readonly ParkRequest[]> {
  const api = new ApiMock(page);
  const organization = { ...organizationOutput(), operatingProfile: profile };
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: [...ALL_ORGANIZATION_PERMISSIONS, 'organization.customers.read'],
  });
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
  await api.mockDashboardEquipmentCreatedTrend(E2E_ORGANIZATION_ID, equipmentCreatedTrendOutput());
  await api.mockDashboardFacilitiesCreatedTrend(
    E2E_ORGANIZATION_ID,
    facilitiesCreatedTrendOutput(),
  );

  const now = new Date();
  const timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString();
  const site = {
    ...facilityOutput({ type: 'site', name: SITE_NAME, hasChildren: false }),
    customerId: CUSTOMER_ID,
  };
  const customer = {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/customers/${CUSTOMER_ID}`,
    '@type': 'Customer',
    id: CUSTOMER_ID,
    organizationId: E2E_ORGANIZATION_ID,
    name: CUSTOMER_NAME,
    code: 'HARBOR',
    email: null,
    phone: null,
    contacts: [],
    archivedAt: null,
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const equipment = Array.from({ length: 6 }, (_, index) => ({
    ...equipmentOutput({
      id: index === 0 ? E2E_EQUIPMENT_ID : `park-equipment-${index}`,
      type: index < 4 ? 'fire_extinguisher' : 'camera',
      status: index < 2 || index === 4 ? 'under_maintenance' : 'operational',
      maintenanceDueStatus: index === 4 ? 'up_to_date' : index % 2 ? 'overdue' : 'due_soon',
      facilityName: SITE_NAME,
    }),
    name:
      index < 4 ? `Harbor fire equipment ${index + 1}` : `Harbor security equipment ${index - 3}`,
    assetCode: `HBR-${index + 1}`,
  }));
  const anomaly = {
    '@id': '/api/park-anomalies/fire',
    '@type': 'NonConformity',
    id: 'park-anomaly-fire',
    inspectionId: E2E_INSPECTION_ID,
    equipmentId: E2E_EQUIPMENT_ID,
    equipmentSerialNumber: 'HBR-FIRE-1',
    description: 'Missing tamper seal',
    severity: 'high',
    status: 'open',
    dueAt: timestamp,
    resolvedAt: null,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const anomalies = [
    anomaly,
    {
      ...anomaly,
      id: 'park-anomaly-security',
      equipmentId: 'park-equipment-4',
      description: 'Camera lens damaged',
      severity: 'low',
    },
  ];
  const requests: ParkRequest[] = [];
  const filteredEquipment = (family: string | null) =>
    equipment.filter((_, index) => family !== 'fire' || index < 4);
  const filteredAnomalies = (family: string | null) => (family === 'fire' ? [anomaly] : anomalies);

  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, site);
  await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, equipment[0]);
  await api.mockInspectionDetail(E2E_ORGANIZATION_ID, {
    ...inspectionOutput({
      result: 'fail',
      status: 'closed',
      nonConformitiesCount: 1,
      performedAt: timestamp,
    }),
    recordStatus: 'published',
  } as ReturnType<typeof inspectionOutput>);
  await page.route(/\/api\/organizations\/[^/]+\/customers(?:\/[^/]+)?(\?.*)?$/u, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    await route.fulfill({
      json: url.pathname.endsWith('/customers') ? hydraCollection([customer]) : customer,
    });
  });
  await page.route(/\/api\/organizations\/[^/]+\/facilities(\?.*)?$/u, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    requests.push({
      path: url.pathname,
      family: null,
      customerId: url.searchParams.get('customerId'),
      facilityId: null,
    });
    await route.fulfill({ json: hydraCollection([site]) });
  });
  await page.route(
    /\/api\/organizations\/[^/]+\/(?:facilities\/[^/]+\/)?(?:equipment-summary|equipment|inspections|park-anomalies-summary|park-anomalies)(\?.*)?$/u,
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const url = new URL(route.request().url());
      const family = url.searchParams.get('family');
      const parts = url.pathname.split('/');
      const facilityId = url.pathname.includes('/facilities/')
        ? (parts[5] ?? null)
        : url.searchParams.get('facilityId');
      requests.push({
        path: url.pathname,
        family,
        customerId: url.searchParams.get('customerId'),
        facilityId,
      });
      const rows = filteredEquipment(family);
      const findings = filteredAnomalies(family);
      if (url.pathname.endsWith('/equipment-summary')) {
        await route.fulfill({
          json: {
            '@id': url.pathname,
            '@type': 'EquipmentSummary',
            scope: facilityId ? 'subtree' : 'organization',
            totalItems: rows.length,
            byStatus: {
              in_stock: 0,
              operational: rows.filter((row) => row.status === 'operational').length,
              under_maintenance: rows.filter((row) => row.status === 'under_maintenance').length,
              decommissioned: 0,
            },
            needingAttentionCount: rows.filter((row) => row.status === 'under_maintenance').length,
          },
        });
      } else if (url.pathname.endsWith('/park-anomalies-summary')) {
        await route.fulfill({
          json: {
            '@id': url.pathname,
            '@type': 'ParkAnomaliesSummary',
            openAnomalies: findings.length,
            bySeverity: {
              low: findings.filter((finding) => finding.severity === 'low').length,
              medium: 0,
              high: findings.filter((finding) => finding.severity === 'high').length,
              critical: 0,
            },
          },
        });
      } else if (url.pathname.endsWith('/park-anomalies')) {
        await route.fulfill({ json: hydraCollection(findings) });
      } else if (url.pathname.endsWith('/equipment')) {
        const narrowed = rows.filter(
          (row) =>
            (!url.searchParams.has('status') || row.status === url.searchParams.get('status')) &&
            (url.searchParams.get('maintenanceDueStatus') !== 'due' ||
              row.maintenanceDueStatus === 'due_soon' ||
              row.maintenanceDueStatus === 'overdue'),
        );
        await route.fulfill({ json: hydraCollection(narrowed) });
      } else {
        await route.fulfill({ json: hydraCollection([]) });
      }
    },
  );
  return requests;
}
