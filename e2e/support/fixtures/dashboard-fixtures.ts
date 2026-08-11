import { E2E_ORGANIZATION_ID } from './api-fixtures';

/**
 * Returns an ISO `YYYY-MM-DD` date `daysAgo` days before today, at local
 * noon — the e2e convention for date-dependent fixtures (`e2e/README.md`),
 * which keeps a bucket from rolling to the previous day under a negative
 * UTC offset.
 */
function isoDate(daysAgo: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export interface OrganizationDashboardMetricFixture {
  readonly key: string;
  readonly value: number | string;
}

export interface OrganizationDashboardComparisonMetricFixture {
  readonly key: string;
  readonly value: number | string;
  readonly direction: 'up' | 'down' | 'flat';
}

export interface OrganizationDashboardHealthMetricFixture {
  readonly key: string;
  readonly value: number;
}

export interface OrganizationDashboardHealthComparisonMetricFixture {
  readonly key: string;
  readonly delta: number;
  readonly direction: 'up' | 'down' | 'flat';
}

export interface OrganizationDashboardAlertFixture {
  readonly code: string;
  readonly severity: string;
  readonly count: number;
}

export interface OrganizationDashboardRecentInterventionFixture {
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

export interface OrganizationDashboardOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly generatedAt: string;
  readonly period: {
    readonly from: string;
    readonly to: string;
    readonly timezone: string;
  };
  readonly overview: {
    readonly facilities: { readonly summary: readonly OrganizationDashboardMetricFixture[] };
    readonly equipment: { readonly summary: readonly OrganizationDashboardMetricFixture[] };
    readonly inspections: { readonly summary: readonly OrganizationDashboardMetricFixture[] };
    readonly nonConformities: { readonly summary: readonly OrganizationDashboardMetricFixture[] };
    readonly interventions: { readonly summary: readonly OrganizationDashboardMetricFixture[] };
  };
  readonly health: { readonly metrics: readonly OrganizationDashboardHealthMetricFixture[] };
  readonly alerts: readonly OrganizationDashboardAlertFixture[];
  readonly comparison: {
    readonly mode: string;
    readonly from: string;
    readonly to: string;
    readonly metrics: readonly OrganizationDashboardComparisonMetricFixture[];
    readonly health: {
      readonly metrics: readonly OrganizationDashboardHealthComparisonMetricFixture[];
    };
  };
  readonly recentInterventions?: readonly OrganizationDashboardRecentInterventionFixture[];
}

/**
 * A fully-populated aggregate `/dashboard` payload: every KPI, its
 * period-over-period comparison, and a non-zero non-conformity severity
 * breakdown — the statistics page's default render.
 */
export function organizationDashboardOutput(
  overrides: Partial<OrganizationDashboardOutputFixture> = {},
): OrganizationDashboardOutputFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/dashboard`,
    '@type': 'OrganizationDashboard',
    generatedAt: new Date().toISOString(),
    period: { from: isoDate(30), to: isoDate(0), timezone: 'UTC' },
    overview: {
      facilities: { summary: [{ key: 'total', value: 12 }] },
      equipment: {
        summary: [
          { key: 'total', value: 48 },
          { key: 'underMaintenance', value: 3 },
        ],
      },
      inspections: { summary: [{ key: 'closed', value: 32 }] },
      nonConformities: {
        summary: [
          { key: 'open', value: 5 },
          { key: 'overdue', value: 1 },
          { key: 'severityCritical', value: 1 },
          { key: 'severityHigh', value: 1 },
          { key: 'severityMedium', value: 2 },
          { key: 'severityLow', value: 1 },
        ],
      },
      interventions: { summary: [{ key: 'open', value: 7 }] },
    },
    health: { metrics: [{ key: 'nonConformityResolutionRate', value: 82.5 }] },
    alerts: [],
    comparison: {
      mode: 'previous_period',
      from: isoDate(60),
      to: isoDate(31),
      metrics: [
        { key: 'facilities', value: 3, direction: 'up' },
        { key: 'equipment', value: 5, direction: 'up' },
        { key: 'inspections', value: 2, direction: 'down' },
      ],
      health: { metrics: [{ key: 'nonConformityResolutionRate', delta: 4.2, direction: 'up' }] },
    },
    ...overrides,
  };
}

/** One dashboard alert row (`GetOrganizationDashboardHandler`'s attention feed), a critical open non-conformity by default. */
export function organizationDashboardAlertOutput(
  overrides: Partial<OrganizationDashboardAlertFixture> = {},
): OrganizationDashboardAlertFixture {
  return {
    code: 'critical_non_conformities_open',
    severity: 'danger',
    count: 2,
    ...overrides,
  };
}

/** One "recently updated" intervention row embedded in the aggregate dashboard payload. */
export function organizationDashboardRecentInterventionOutput(
  overrides: Partial<OrganizationDashboardRecentInterventionFixture> = {},
): OrganizationDashboardRecentInterventionFixture {
  return {
    id: 'e2e-intervention-recent-1',
    number: 205,
    name: 'Replace corridor extinguisher',
    status: 'in_progress',
    priority: 'high',
    siteId: 'e2e-facility-1',
    siteName: 'North Building',
    responsibleId: 'e2e-member-1',
    responsibleName: 'Jamie Rivera',
    responsibleAvatarUrl: null,
    dueAt: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export interface OrganizationDashboardTrendPointFixture {
  readonly bucket: string;
  readonly count: number;
}

export interface OrganizationDashboardTrendOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly generatedAt: string;
  readonly metric: string;
  readonly period: {
    readonly from: string;
    readonly to: string;
    readonly timezone: string;
    readonly granularity: string;
  };
  readonly summary: { readonly total: number };
  readonly series: readonly OrganizationDashboardTrendPointFixture[];
  readonly comparison: {
    readonly mode: string;
    readonly summary: { readonly total: number; readonly delta: number };
  };
}

/** Builds a week of daily trend points, oldest bucket first, from an ordered value list. */
function buildTrendSeries(
  values: readonly number[],
): readonly OrganizationDashboardTrendPointFixture[] {
  return values.map((count, index) => ({ bucket: isoDate(values.length - 1 - index), count }));
}

/**
 * A dedicated `/dashboard/trends/*` payload for one metric. `series` defaults
 * to a week of non-zero daily buckets — a real, string-labelled x-axis, which
 * is exactly the shape that regressed `LineChart`'s `roundDomains` before the
 * fix (`shared/chart/ui/components/line-chart`).
 */
export function organizationDashboardTrendOutput(
  metric: string,
  overrides: Partial<OrganizationDashboardTrendOutputFixture> & {
    readonly values?: readonly number[];
  } = {},
): OrganizationDashboardTrendOutputFixture {
  const { values, series, ...rest } = overrides;
  const resolvedSeries = series ?? buildTrendSeries(values ?? [2, 3, 1, 4, 2, 5, 3]);
  const total = resolvedSeries.reduce((sum, point) => sum + point.count, 0);

  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/dashboard/trends/${metric}`,
    '@type': 'OrganizationDashboardTrend',
    generatedAt: new Date().toISOString(),
    metric,
    period: { from: isoDate(6), to: isoDate(0), timezone: 'UTC', granularity: 'day' },
    summary: { total },
    series: resolvedSeries,
    comparison: { mode: 'previous_period', summary: { total: Math.max(0, total - 3), delta: 8.3 } },
    ...rest,
  };
}

/** Default inspections trend: the Inspections chart's single series. */
export function inspectionsTrendOutput(
  overrides: Partial<OrganizationDashboardTrendOutputFixture> & {
    readonly values?: readonly number[];
  } = {},
): OrganizationDashboardTrendOutputFixture {
  return organizationDashboardTrendOutput('inspections', {
    values: [2, 3, 1, 4, 2, 5, 3],
    ...overrides,
  });
}

/** Default opened non-conformities trend: one of the two Non-conformities chart series. */
export function nonConformitiesOpenedTrendOutput(
  overrides: Partial<OrganizationDashboardTrendOutputFixture> & {
    readonly values?: readonly number[];
  } = {},
): OrganizationDashboardTrendOutputFixture {
  return organizationDashboardTrendOutput('non_conformities_opened', {
    values: [1, 2, 0, 1, 3, 1, 2],
    ...overrides,
  });
}

/** Default resolved non-conformities trend: the other Non-conformities chart series. */
export function nonConformitiesResolvedTrendOutput(
  overrides: Partial<OrganizationDashboardTrendOutputFixture> & {
    readonly values?: readonly number[];
  } = {},
): OrganizationDashboardTrendOutputFixture {
  return organizationDashboardTrendOutput('non_conformities_resolved', {
    values: [0, 1, 1, 2, 1, 2, 3],
    ...overrides,
  });
}

/** Default equipment-created trend: the Equipment added area chart. */
export function equipmentCreatedTrendOutput(
  overrides: Partial<OrganizationDashboardTrendOutputFixture> & {
    readonly values?: readonly number[];
  } = {},
): OrganizationDashboardTrendOutputFixture {
  return organizationDashboardTrendOutput('equipment_created', {
    values: [1, 0, 2, 1, 3, 0, 1],
    ...overrides,
  });
}

/** Default facilities-created trend: the Facilities added area chart. */
export function facilitiesCreatedTrendOutput(
  overrides: Partial<OrganizationDashboardTrendOutputFixture> & {
    readonly values?: readonly number[];
  } = {},
): OrganizationDashboardTrendOutputFixture {
  return organizationDashboardTrendOutput('facilities_created', {
    values: [0, 0, 1, 0, 0, 1, 0],
    ...overrides,
  });
}
