/**
 * Organization dashboard transport fixtures: the aggregate `/dashboard`
 * payload and its five dedicated `/dashboard/trends/*` series. Shapes
 * mirror `OrganizationDashboardOutput` / `OrganizationDashboardTrendOutput`
 * (`src/app/features/organization/models/dashboard`) — loose Hydra-style
 * records keyed by backend-defined field names, not strict DTOs.
 *
 * Plain factory functions (like `api-fixtures.ts`) so specs override fields
 * via object spread. Each trend factory ships its own plausible eight-point
 * series (current + comparison) so a caller that just wants a populated
 * dashboard needs no arguments at all.
 */

export interface DashboardTrendPointFixture {
  readonly bucket: string;
  readonly value: number;
}

export interface DashboardAlertFixture {
  readonly code: string;
  readonly severity: string;
  readonly count: number;
}

export interface DashboardRecentInterventionFixture {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly status: string;
  readonly priority: string;
  readonly siteId: string | null;
  readonly siteName: string | null;
  readonly responsibleId: string | null;
  readonly responsibleName: string | null;
  readonly responsibleAvatarUrl: string | null;
  readonly dueAt: string | null;
  readonly updatedAt: string;
}

/** One row of the dashboard payload's embedded `recentInterventions` table. */
function dashboardRecentIntervention(
  overrides: Partial<DashboardRecentInterventionFixture> = {},
): DashboardRecentInterventionFixture {
  return {
    id: 'e2e-dash-i-1',
    number: 512,
    name: 'Annual fire safety walkthrough — HQ',
    status: 'in_progress',
    priority: 'high',
    siteId: 'e2e-dash-fac-1',
    siteName: 'Headquarters — Paris',
    responsibleId: 'e2e-dash-mem-1',
    responsibleName: 'Amelie Rousseau',
    responsibleAvatarUrl: null,
    dueAt: '2026-08-10T00:00:00+00:00',
    updatedAt: '2026-08-04T08:30:00+00:00',
    ...overrides,
  };
}

export interface DashboardOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly generatedAt: string;
  readonly period: {
    readonly from: string;
    readonly to: string;
    readonly timezone: string;
  };
  readonly overview: Readonly<
    Record<string, { readonly summary: ReadonlyArray<{ readonly value: number }> }>
  >;
  readonly health: Readonly<Record<string, unknown>>;
  readonly alerts: ReadonlyArray<DashboardAlertFixture>;
  readonly comparison: {
    readonly metrics: ReadonlyArray<{
      readonly key: string;
      readonly value: number;
      readonly direction: string;
    }>;
  };
  readonly trends: Readonly<Record<string, ReadonlyArray<DashboardTrendPointFixture>>>;
  readonly recentInterventions: ReadonlyArray<DashboardRecentInterventionFixture>;
}

/**
 * The aggregate `GET .../dashboard` payload: the four overview counts with
 * their period-over-period comparison and embedded sparkline trend, the
 * attention `alerts` feed (two known codes with non-zero counts, one at
 * `high` severity), and a five-row `recentInterventions` table — all in the
 * one response the frontend reads (`OrganizationDashboardOutput`).
 */
export function dashboardOutput(
  overrides: Partial<DashboardOutputFixture> = {},
): DashboardOutputFixture {
  return {
    '@id': '/api/organizations/e2e-org-1/dashboard',
    '@type': 'OrganizationDashboard',
    generatedAt: '2026-08-04T09:00:00+00:00',
    period: {
      from: '2026-07-01T00:00:00+00:00',
      to: '2026-08-04T00:00:00+00:00',
      timezone: 'UTC',
    },
    overview: {
      facilities: { summary: [{ value: 6 }] },
      members: { summary: [{ value: 14 }] },
      equipment: { summary: [{ value: 42 }] },
      inspections: { summary: [{ value: 128 }] },
    },
    health: {},
    alerts: [
      { code: 'critical_non_conformities_open', severity: 'high', count: 3 },
      { code: 'equipment_under_maintenance', severity: 'medium', count: 5 },
    ],
    comparison: {
      metrics: [
        { key: 'facilities', value: 2, direction: 'up' },
        { key: 'members', value: 3, direction: 'up' },
        { key: 'equipment', value: 5, direction: 'up' },
        { key: 'inspections', value: -4, direction: 'down' },
      ],
    },
    trends: {
      // Daily running totals leading up to each `overview` count above —
      // `DashboardStore.*Sparkline` reads these as-is, in array order.
      facilities: [
        { bucket: '2026-07-28', value: 1 },
        { bucket: '2026-07-29', value: 2 },
        { bucket: '2026-07-30', value: 2 },
        { bucket: '2026-07-31', value: 3 },
        { bucket: '2026-08-01', value: 4 },
        { bucket: '2026-08-02', value: 4 },
        { bucket: '2026-08-03', value: 5 },
        { bucket: '2026-08-04', value: 6 },
      ],
      members: [
        { bucket: '2026-07-28', value: 8 },
        { bucket: '2026-07-29', value: 9 },
        { bucket: '2026-07-30', value: 10 },
        { bucket: '2026-07-31', value: 11 },
        { bucket: '2026-08-01', value: 12 },
        { bucket: '2026-08-02', value: 13 },
        { bucket: '2026-08-03', value: 13 },
        { bucket: '2026-08-04', value: 14 },
      ],
      equipment: [
        { bucket: '2026-07-28', value: 30 },
        { bucket: '2026-07-29', value: 32 },
        { bucket: '2026-07-30', value: 34 },
        { bucket: '2026-07-31', value: 36 },
        { bucket: '2026-08-01', value: 38 },
        { bucket: '2026-08-02', value: 39 },
        { bucket: '2026-08-03', value: 40 },
        { bucket: '2026-08-04', value: 42 },
      ],
      inspections: [
        { bucket: '2026-07-28', value: 95 },
        { bucket: '2026-07-29', value: 100 },
        { bucket: '2026-07-30', value: 105 },
        { bucket: '2026-07-31', value: 110 },
        { bucket: '2026-08-01', value: 115 },
        { bucket: '2026-08-02', value: 120 },
        { bucket: '2026-08-03', value: 124 },
        { bucket: '2026-08-04', value: 128 },
      ],
    },
    recentInterventions: [
      dashboardRecentIntervention(),
      dashboardRecentIntervention({
        id: 'e2e-dash-i-2',
        number: 511,
        name: 'Sprinkler network inspection — Warehouse B',
        status: 'submitted',
        priority: 'normal',
        siteId: 'e2e-dash-fac-2',
        siteName: 'Warehouse B — Lyon',
        responsibleId: 'e2e-dash-mem-2',
        responsibleName: 'Bruno Lemaire',
        dueAt: '2026-08-06T00:00:00+00:00',
        updatedAt: '2026-08-03T16:15:00+00:00',
      }),
      dashboardRecentIntervention({
        id: 'e2e-dash-i-3',
        number: 509,
        name: 'Evacuation route compliance check',
        status: 'changes_requested',
        priority: 'urgent',
        responsibleId: 'e2e-dash-mem-3',
        responsibleName: 'Claire Lefèvre',
        dueAt: '2026-08-05T00:00:00+00:00',
        updatedAt: '2026-08-03T11:00:00+00:00',
      }),
      dashboardRecentIntervention({
        id: 'e2e-dash-i-4',
        number: 505,
        name: 'Extinguisher recharge — East wing',
        status: 'planned',
        priority: 'low',
        siteId: 'e2e-dash-fac-3',
        siteName: 'East Wing Depot',
        responsibleId: null,
        responsibleName: null,
        dueAt: '2026-08-15T00:00:00+00:00',
        updatedAt: '2026-08-02T09:45:00+00:00',
      }),
      dashboardRecentIntervention({
        id: 'e2e-dash-i-5',
        number: 498,
        name: 'Q2 compliance closeout',
        status: 'published',
        priority: 'normal',
        siteId: 'e2e-dash-fac-2',
        siteName: 'Warehouse B — Lyon',
        dueAt: null,
        updatedAt: '2026-07-30T14:00:00+00:00',
      }),
    ],
    ...overrides,
  };
}

export interface DashboardTrendOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly generatedAt: string;
  readonly metric: string;
  readonly period: {
    readonly granularity: string;
    readonly from: string;
    readonly to: string;
  };
  readonly summary: { readonly total: number };
  readonly series: ReadonlyArray<DashboardTrendPointFixture>;
  readonly comparison: { readonly series: ReadonlyArray<DashboardTrendPointFixture> };
}

/**
 * Builds one `/dashboard/trends/*` payload. `series` is the current period
 * (ISO week buckets — `week` is the dashboard's default granularity, and
 * `formatDashboardTrendBucket` reads a `YYYY-Www` bucket as a week range);
 * `comparison.series` is the previous period, read because compare mode is
 * on by default.
 */
function dashboardTrendOutput(
  metric: string,
  series: ReadonlyArray<DashboardTrendPointFixture>,
  comparisonSeries: ReadonlyArray<DashboardTrendPointFixture>,
  overrides: Partial<DashboardTrendOutputFixture> = {},
): DashboardTrendOutputFixture {
  return {
    '@id': `/api/organizations/e2e-org-1/dashboard/trends/${metric}`,
    '@type': 'OrganizationDashboardTrend',
    generatedAt: '2026-08-04T09:00:00+00:00',
    metric,
    period: {
      granularity: 'week',
      from: '2026-06-08T00:00:00+00:00',
      to: '2026-08-04T00:00:00+00:00',
    },
    summary: { total: series.reduce((sum, point) => sum + point.value, 0) },
    series,
    comparison: { series: comparisonSeries },
    ...overrides,
  };
}

/** Eight-week rising series backing the inspections trend (Overview + Inspection Quality cards). */
export function dashboardInspectionsTrend(
  overrides: Partial<DashboardTrendOutputFixture> = {},
): DashboardTrendOutputFixture {
  return dashboardTrendOutput(
    'inspections',
    [
      { bucket: '2026-W27', value: 8 },
      { bucket: '2026-W28', value: 10 },
      { bucket: '2026-W29', value: 9 },
      { bucket: '2026-W30', value: 12 },
      { bucket: '2026-W31', value: 11 },
      { bucket: '2026-W32', value: 14 },
      { bucket: '2026-W33', value: 13 },
      { bucket: '2026-W34', value: 16 },
    ],
    [
      { bucket: '2026-W19', value: 6 },
      { bucket: '2026-W20', value: 7 },
      { bucket: '2026-W21', value: 6 },
      { bucket: '2026-W22', value: 8 },
      { bucket: '2026-W23', value: 7 },
      { bucket: '2026-W24', value: 9 },
      { bucket: '2026-W25', value: 8 },
      { bucket: '2026-W26', value: 10 },
    ],
    overrides,
  );
}

/** Eight-week fluctuating series backing the non-conformities-opened trend (Overview + its own card). */
export function dashboardNonConformitiesOpenedTrend(
  overrides: Partial<DashboardTrendOutputFixture> = {},
): DashboardTrendOutputFixture {
  return dashboardTrendOutput(
    'nonConformitiesOpened',
    [
      { bucket: '2026-W27', value: 6 },
      { bucket: '2026-W28', value: 5 },
      { bucket: '2026-W29', value: 7 },
      { bucket: '2026-W30', value: 6 },
      { bucket: '2026-W31', value: 8 },
      { bucket: '2026-W32', value: 6 },
      { bucket: '2026-W33', value: 9 },
      { bucket: '2026-W34', value: 7 },
    ],
    [
      { bucket: '2026-W19', value: 4 },
      { bucket: '2026-W20', value: 4 },
      { bucket: '2026-W21', value: 5 },
      { bucket: '2026-W22', value: 4 },
      { bucket: '2026-W23', value: 6 },
      { bucket: '2026-W24', value: 4 },
      { bucket: '2026-W25', value: 7 },
      { bucket: '2026-W26', value: 5 },
    ],
    overrides,
  );
}

/** Eight-week rising series backing the non-conformities-resolved trend (Overview + its own card). */
export function dashboardNonConformitiesResolvedTrend(
  overrides: Partial<DashboardTrendOutputFixture> = {},
): DashboardTrendOutputFixture {
  return dashboardTrendOutput(
    'nonConformitiesResolved',
    [
      { bucket: '2026-W27', value: 3 },
      { bucket: '2026-W28', value: 4 },
      { bucket: '2026-W29', value: 5 },
      { bucket: '2026-W30', value: 5 },
      { bucket: '2026-W31', value: 6 },
      { bucket: '2026-W32', value: 7 },
      { bucket: '2026-W33', value: 7 },
      { bucket: '2026-W34', value: 9 },
    ],
    [
      { bucket: '2026-W19', value: 2 },
      { bucket: '2026-W20', value: 3 },
      { bucket: '2026-W21', value: 3 },
      { bucket: '2026-W22', value: 4 },
      { bucket: '2026-W23', value: 4 },
      { bucket: '2026-W24', value: 5 },
      { bucket: '2026-W25', value: 5 },
      { bucket: '2026-W26', value: 6 },
    ],
    overrides,
  );
}

/** Eight-week fluctuating-rise series backing the equipment-created trend (Asset Growth card). */
export function dashboardEquipmentCreatedTrend(
  overrides: Partial<DashboardTrendOutputFixture> = {},
): DashboardTrendOutputFixture {
  return dashboardTrendOutput(
    'equipmentCreated',
    [
      { bucket: '2026-W27', value: 3 },
      { bucket: '2026-W28', value: 2 },
      { bucket: '2026-W29', value: 4 },
      { bucket: '2026-W30', value: 3 },
      { bucket: '2026-W31', value: 5 },
      { bucket: '2026-W32', value: 4 },
      { bucket: '2026-W33', value: 6 },
      { bucket: '2026-W34', value: 5 },
    ],
    [
      { bucket: '2026-W19', value: 2 },
      { bucket: '2026-W20', value: 2 },
      { bucket: '2026-W21', value: 3 },
      { bucket: '2026-W22', value: 2 },
      { bucket: '2026-W23', value: 4 },
      { bucket: '2026-W24', value: 3 },
      { bucket: '2026-W25', value: 4 },
      { bucket: '2026-W26', value: 3 },
    ],
    overrides,
  );
}

/** Eight-week slow-rise series backing the facilities-created trend (Asset Growth card). */
export function dashboardFacilitiesCreatedTrend(
  overrides: Partial<DashboardTrendOutputFixture> = {},
): DashboardTrendOutputFixture {
  return dashboardTrendOutput(
    'facilitiesCreated',
    [
      { bucket: '2026-W27', value: 1 },
      { bucket: '2026-W28', value: 2 },
      { bucket: '2026-W29', value: 1 },
      { bucket: '2026-W30', value: 2 },
      { bucket: '2026-W31', value: 3 },
      { bucket: '2026-W32', value: 2 },
      { bucket: '2026-W33', value: 3 },
      { bucket: '2026-W34', value: 4 },
    ],
    [
      { bucket: '2026-W19', value: 1 },
      { bucket: '2026-W20', value: 1 },
      { bucket: '2026-W21', value: 1 },
      { bucket: '2026-W22', value: 1 },
      { bucket: '2026-W23', value: 2 },
      { bucket: '2026-W24', value: 1 },
      { bucket: '2026-W25', value: 2 },
      { bucket: '2026-W26', value: 2 },
    ],
    overrides,
  );
}
