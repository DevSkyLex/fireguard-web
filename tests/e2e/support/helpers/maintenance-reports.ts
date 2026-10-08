import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';
import type {
  MaintenanceEconomicReportOutput,
  MaintenanceEconomicRow,
  MaintenanceFinancialDossierOutput,
} from '@features/organization/features/maintenance-costs/models';
import { maintenanceCostFixture } from '@features/organization/features/maintenance-costs/models/maintenance-cost/testing/maintenance-cost.fixture';
import {
  economicAmount,
  maintenanceReportFixture,
  REPORT_INTERVENTION_ID,
  REPORT_OTHER_INTERVENTION_ID,
  REPORT_SITE_ID,
  REPORT_CUSTOMER_ID,
  REPORT_EQUIPMENT_ID,
} from '@features/organization/features/maintenance-costs/models/report/testing/maintenance-report.fixture';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../fixtures/api-fixtures';
import { ApiMock } from '../mocks/api-mock';

export {
  REPORT_INTERVENTION_ID,
  REPORT_OTHER_INTERVENTION_ID,
  REPORT_SITE_ID,
  REPORT_CUSTOMER_ID,
  REPORT_EQUIPMENT_ID,
};
export const MAINTENANCE_REPORTS_URL = `/organizations/${E2E_ORGANIZATION_ID}/maintenance-costs/reports`;
export const LARGE_EXACT_AMOUNT = '9007199254740993.123456';
export const LARGE_FILTERED_AMOUNT = '9007199254741018.123456';
export const LONG_ALLOCATION_NAME =
  'Entrance extinguisher — EX-001 — distribution depot, northern maintenance annex and emergency-access corridor';
export const LONG_SITE_NAME = 'Northern distribution depot and emergency maintenance annex';
export const LONG_CUSTOMER_NAME =
  'Multi-site operator — industrial distribution and fire safety services';
export const SOURCE_DOSSIER_NAME =
  'Entrance extinguisher corrective maintenance — pressure gauge and documented return visit';
export const OTHER_DOSSIER_NAME = 'Hall extinguisher repair — independent source dossier';

export interface MaintenanceReportsMockState {
  readonly report: MaintenanceEconomicReportOutput;
  readonly dossiers: readonly MaintenanceFinancialDossierOutput[];
  readonly reportRequests: Record<string, string>[];
  readonly directoryRequests: Record<string, string>[];
  readonly privateDossierRequests: string[];
  readonly operationalRequests: string[];
}

/** Financial read alone opens precise private endpoints; the authenticated safety net rejects unknown calls. */
export async function installMaintenanceReports(
  page: Page,
  options: {
    readonly incomplete?: boolean;
    readonly compact?: boolean;
    readonly refuseBroad?: boolean;
  } = {},
): Promise<MaintenanceReportsMockState> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: ['organization.maintenance_cost.read'],
  });
  const base = maintenanceReportFixture();
  const first = base.rows[0],
    other = base.rows[1];
  const firstSource = base.dossiers[0],
    otherSource = base.dossiers[1];
  if (!first || !other || !firstSource || !otherSource)
    throw new Error('The report requires two independently named allocations.');
  const rows: MaintenanceEconomicRow[] = [
    {
      ...first,
      name: LONG_ALLOCATION_NAME,
      current: economicAmount(LARGE_EXACT_AMOUNT, 1),
      variance: '9007199254740984.123456',
    },
    {
      ...other,
      current: options.incomplete
        ? {
            total: null,
            knownTotal: '20.000000',
            complete: false,
            contributionCount: 2,
            unknownCount: 1,
          }
        : other.current,
      frozen: options.incomplete
        ? {
            total: null,
            knownTotal: '0.000000',
            complete: false,
            contributionCount: 1,
            unknownCount: 1,
          }
        : other.frozen,
    },
  ];
  if (!options.compact) {
    for (let index = 2; index < 31; index += 1)
      rows.push({
        ...other,
        id: `810e8400-e29b-41d4-a716-${String(446655820000 + index)}`,
        name: `Fire equipment allocation ${index + 1}`,
        current: economicAmount(),
        frozen: economicAmount(),
        planned: economicAmount(),
        variance: '0.000000',
      });
  }
  const current = options.incomplete
    ? {
        total: null,
        knownTotal: LARGE_FILTERED_AMOUNT,
        complete: false,
        contributionCount: 4,
        unknownCount: 1,
      }
    : economicAmount(LARGE_FILTERED_AMOUNT, 3);
  const frozen = options.incomplete
    ? {
        total: null,
        knownTotal: '8.000000',
        complete: false,
        contributionCount: 2,
        unknownCount: 1,
      }
    : base.frozen;
  const report = maintenanceReportFixture({
    organizationId: E2E_ORGANIZATION_ID,
    rows,
    totalItems: rows.length,
    current,
    variance: options.incomplete ? null : '9007199254740994.123456',
    missingSnapshotCount: options.incomplete ? 1 : 0,
    frozen,
    dossiers: [
      { ...firstSource, name: SOURCE_DOSSIER_NAME },
      {
        ...otherSource,
        name: OTHER_DOSSIER_NAME,
        snapshotState: options.incomplete ? 'snapshot_missing' : 'available',
      },
    ],
    reconciliation: { ...base.reconciliation, sourceCurrent: current, sourceFrozen: frozen },
  });
  const dossier: MaintenanceFinancialDossierOutput = {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/maintenance-cost/dossiers/${REPORT_INTERVENTION_ID}`,
    '@type': 'MaintenanceFinancialDossier',
    id: REPORT_INTERVENTION_ID,
    number: 1,
    name: SOURCE_DOSSIER_NAME,
    type: 'corrective_maintenance',
    status: 'published',
    publishedAt: '2025-01-31T12:00:00Z',
    snapshotState: 'available',
    identityComplete: true,
    site: { id: REPORT_SITE_ID, name: LONG_SITE_NAME },
    customer: { id: REPORT_CUSTOMER_ID, name: LONG_CUSTOMER_NAME },
    equipment: [
      {
        id: REPORT_EQUIPMENT_ID,
        name: LONG_ALLOCATION_NAME,
        assetReference: 'EX-001',
        site: { id: REPORT_SITE_ID, name: LONG_SITE_NAME },
        customer: { id: REPORT_CUSTOMER_ID, name: LONG_CUSTOMER_NAME },
      },
    ],
  };
  const dossiers = [
    dossier,
    ...Array.from({ length: options.compact ? 1 : 30 }, (_, index) => ({
      ...dossier,
      id:
        index === 0
          ? REPORT_OTHER_INTERVENTION_ID
          : `810e8400-e29b-41d4-a716-${String(446655830000 + index)}`,
      number: index + 2,
      name: index === 0 ? OTHER_DOSSIER_NAME : `Other fire maintenance ${index + 2}`,
    })),
  ];
  const state: MaintenanceReportsMockState = {
    report,
    dossiers,
    reportRequests: [],
    directoryRequests: [],
    privateDossierRequests: [],
    operationalRequests: [],
  };
  const prefix = `/api/organizations/${E2E_ORGANIZATION_ID}`;
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (
      new RegExp(`^${prefix}/(?:equipment|equipment-types|facilities|customers)(?:/|$)`).test(
        path,
      ) ||
      path === `${prefix}/interventions`
    )
      state.operationalRequests.push(path);
  });
  await page.route(
    (url) => url.pathname === `${prefix}/maintenance-cost/reports`,
    async (route) => {
      expect(route.request().method()).toBe('GET');
      const query = Object.fromEntries(new URL(route.request().url()).searchParams);
      state.reportRequests.push(query);
      expect(query['from']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(query['to']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['equipment', 'site', 'customer']).toContain(query['groupBy']);
      const windowDays =
        (Date.parse(`${query['to']}T00:00:00Z`) - Date.parse(`${query['from']}T00:00:00Z`)) /
          86_400_000 +
        1;
      if (options.refuseBroad && windowDays > 7) {
        await route.fulfill({
          status: 422,
          contentType: 'application/problem+json',
          json: {
            title: 'Scope too large',
            detail:
              'More than 500 source dossiers match this organization date window. Choose a shorter date window.',
            status: 422,
          },
        });
        return;
      }
      const currentPage = Number(query['page'] ?? 1),
        size = Number(query['itemsPerPage'] ?? 30);
      const filtered = query['equipmentId']
        ? rows.filter((row) => row.id === query['equipmentId'])
        : rows;
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        json: {
          ...report,
          ...(query['equipmentId'] === REPORT_EQUIPMENT_ID
            ? {
                current: economicAmount('9007199254740998.123456', 2),
                frozen: economicAmount('8.000000', 1),
                planned: economicAmount('9.000000', 1),
                variance: '9007199254740989.123456',
                reconciliation: {
                  ...report.reconciliation,
                  excludedCurrent: rows[1]?.current ?? economicAmount(),
                  excludedFrozen: rows[1]?.frozen ?? economicAmount(),
                  excludedPlanned: rows[1]?.planned ?? economicAmount(),
                },
              }
            : {}),
          '@id': `${prefix}/maintenance-cost/reports`,
          from: query['from'],
          to: query['to'],
          procurement: {
            ...report.procurement,
            from: `${query['from']}T00:00:00Z`,
            to: new Date(Date.parse(`${query['to']}T00:00:00Z`) + 86_400_000).toISOString(),
          },
          groupBy: query['groupBy'],
          page: currentPage,
          itemsPerPage: size,
          totalItems: filtered.length,
          rows: filtered.slice((currentPage - 1) * size, currentPage * size),
        },
      });
    },
  );
  await page.route(
    (url) => url.pathname === `${prefix}/maintenance-cost/dossiers`,
    async (route) => {
      expect(route.request().method()).toBe('GET');
      const query = Object.fromEntries(new URL(route.request().url()).searchParams);
      state.directoryRequests.push(query);
      const search = (query['search'] ?? '').toLowerCase(),
        currentPage = Number(query['page'] ?? 1),
        size = Number(query['itemsPerPage'] ?? 30);
      const filtered = dossiers.filter((entry) =>
        `${entry.number} ${entry.name}`.toLowerCase().includes(search),
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        json: hydraCollection(filtered.slice((currentPage - 1) * size, currentPage * size), {
          '@id': `${prefix}/maintenance-cost/dossiers`,
          totalItems: filtered.length,
        }),
      });
    },
  );
  await page.route(
    (url) => url.pathname === `${prefix}/interventions/${REPORT_INTERVENTION_ID}/costs`,
    async (route) => {
      expect(route.request().method()).toBe('GET');
      state.privateDossierRequests.push(new URL(route.request().url()).pathname);
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        json: maintenanceCostFixture({
          '@id': `${prefix}/interventions/${REPORT_INTERVENTION_ID}/costs`,
          organizationId: E2E_ORGANIZATION_ID,
          interventionId: REPORT_INTERVENTION_ID,
          id: REPORT_INTERVENTION_ID,
          planningEditable: false,
        }),
      });
    },
  );
  return state;
}

/** Keeps named native financial surfaces available as durable visual evidence outside runner output. */
export async function captureMaintenanceReport(
  page: Page,
  info: TestInfo,
  name: string,
): Promise<void> {
  const directory = join('tests/e2e/artifacts/fireguard-v3/maintenance-reports', info.project.name);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, `${name}.png`), animations: 'disabled' });
}
