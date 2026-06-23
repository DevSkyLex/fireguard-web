import type { HydraItem } from '@core/api/models';

/**
 * Type OrganizationDashboardOverviewValue
 *
 * @description
 * Primitive value supported by one overview
 * metric entry in the dashboard payload.
 */
export type OrganizationDashboardOverviewValue = number | string;

/**
 * Type OrganizationDashboardOverviewMetric
 *
 * @description
 * One overview metric entry returned by the backend,
 * keyed by backend-defined field names.
 */
export type OrganizationDashboardOverviewMetric = Readonly<
  Record<string, OrganizationDashboardOverviewValue>
>;

/**
 * Type OrganizationDashboardOverviewSection
 *
 * @description
 * One overview section grouping metric arrays under
 * backend-defined subsection keys.
 */
export type OrganizationDashboardOverviewSection = Readonly<
  Record<string, readonly OrganizationDashboardOverviewMetric[]>
>;

/**
 * Type OrganizationDashboardOverview
 *
 * @description
 * Top-level overview map returned by the organization
 * dashboard aggregate endpoint.
 */
export type OrganizationDashboardOverview = Readonly<
  Record<string, OrganizationDashboardOverviewSection>
>;

/**
 * Type OrganizationDashboardHealthValue
 *
 * @description
 * Primitive value supported by one dashboard
 * health metric entry.
 */
export type OrganizationDashboardHealthValue = number | string;

/**
 * Type OrganizationDashboardHealthMetric
 *
 * @description
 * One health metric entry returned by the dashboard,
 * keyed by backend-defined field names.
 */
export type OrganizationDashboardHealthMetric = Readonly<
  Record<string, OrganizationDashboardHealthValue>
>;

/**
 * Type OrganizationDashboardHealth
 *
 * @description
 * Top-level health metrics map returned by the
 * organization dashboard payload.
 */
export type OrganizationDashboardHealth = Readonly<
  Record<string, readonly OrganizationDashboardHealthMetric[]>
>;

/**
 * Type OrganizationDashboardAlertValue
 *
 * @description
 * Primitive value supported inside one dashboard
 * alert entry.
 */
export type OrganizationDashboardAlertValue = number | string;

/**
 * Type OrganizationDashboardAlert
 *
 * @description
 * Alert entry returned by the dashboard payload,
 * describing an item that requires attention.
 */
export type OrganizationDashboardAlert = Readonly<
  Record<string, OrganizationDashboardAlertValue>
> & {
  readonly code?: string;
  readonly severity?: string;
  readonly count?: number;
};

/**
 * Type OrganizationDashboardTrendPointValue
 *
 * @description
 * Primitive value supported inside one embedded
 * dashboard trend point.
 */
export type OrganizationDashboardTrendPointValue = number | string;

/**
 * Type OrganizationDashboardTrendPoint
 *
 * @description
 * One embedded dashboard trend point keyed by
 * backend-defined field names.
 */
export type OrganizationDashboardTrendPoint = Readonly<
  Record<string, OrganizationDashboardTrendPointValue>
>;

/**
 * Type OrganizationDashboardTrends
 *
 * @description
 * Optional embedded trends map returned by the
 * aggregate dashboard payload.
 */
export type OrganizationDashboardTrends = Readonly<
  Record<string, readonly OrganizationDashboardTrendPoint[]>
>;

/**
 * Type OrganizationDashboardComparisonMetricValue
 *
 * @description
 * Primitive value supported inside one comparison
 * metric entry.
 */
export type OrganizationDashboardComparisonMetricValue = number | string | null;

/**
 * Type OrganizationDashboardComparisonMetric
 *
 * @description
 * One comparison metric entry returned by the
 * dashboard comparison block.
 */
export type OrganizationDashboardComparisonMetric = Readonly<
  Record<string, OrganizationDashboardComparisonMetricValue>
>;

/**
 * Type OrganizationDashboardComparisonMetricGroup
 *
 * @description
 * Ordered collection of comparison metrics belonging
 * to the same logical group.
 */
export type OrganizationDashboardComparisonMetricGroup =
  readonly OrganizationDashboardComparisonMetric[];

/**
 * Type OrganizationDashboardComparisonMetricGroups
 *
 * @description
 * Named collection of comparison metric groups,
 * such as grouped health comparisons.
 */
export type OrganizationDashboardComparisonMetricGroups = Readonly<
  Record<string, OrganizationDashboardComparisonMetricGroup>
>;

/**
 * Type OrganizationDashboardComparisonValue
 *
 * @description
 * Supported value types exposed by the dashboard
 * comparison object.
 */
export type OrganizationDashboardComparisonValue =
  | OrganizationDashboardComparisonMetricGroups
  | OrganizationDashboardComparisonMetricGroup
  | string
  | null;

/**
 * Type OrganizationDashboardComparison
 *
 * @description
 * Comparison block returned alongside the aggregate
 * dashboard payload for the previous period.
 */
export type OrganizationDashboardComparison = Readonly<
  Record<string, OrganizationDashboardComparisonValue>
> & {
  readonly mode?: string | null;
  readonly from?: string | null;
  readonly to?: string | null;
  readonly metrics?: OrganizationDashboardComparisonMetricGroup;
  readonly health?: OrganizationDashboardComparisonMetricGroups | null;
};

/**
 * Interface OrganizationDashboardPeriod
 * @interface OrganizationDashboardPeriod
 *
 * @description
 * Period metadata describing the time window used
 * to compute the dashboard payload.
 */
export interface OrganizationDashboardPeriod {
  //#region Properties
  /**
   * Property from
   * @readonly
   *
   * @description
   * Inclusive start date of the dashboard period,
   * in ISO 8601 format.
   *
   * @type {string}
   */
  readonly from?: string;

  /**
   * Property to
   * @readonly
   *
   * @description
   * Inclusive end date of the dashboard period,
   * in ISO 8601 format.
   *
   * @type {string}
   */
  readonly to?: string;

  /**
   * Property timezone
   * @readonly
   *
   * @description
   * Timezone used by the backend to aggregate
   * dashboard metrics.
   *
   * @type {string}
   */
  readonly timezone?: string;

  /**
   * Property granularity
   * @readonly
   *
   * @description
   * Optional bucket granularity applied to trend
   * data in the dashboard response.
   *
   * @type {string}
   */
  readonly granularity?: string;

  /**
   * Property [key: string]
   * @readonly
   *
   * @description
   * Additional backend-provided period metadata.
   *
   * @type {string | undefined}
   */
  readonly [key: string]: string | undefined;
  //#endregion
}

/**
 * Interface OrganizationDashboardOutput
 * @interface OrganizationDashboardOutput
 *
 * @description
 * Aggregate organization dashboard payload returned
 * by the `/dashboard` endpoint.
 */
export interface OrganizationDashboardOutput extends HydraItem {
  //#region Properties
  /**
   * Property generatedAt
   * @readonly
   *
   * @description
   * Timestamp indicating when the dashboard payload
   * was generated by the backend.
   *
   * @type {string}
   */
  readonly generatedAt: string;

  /**
   * Property period
   * @readonly
   *
   * @description
   * Period metadata used to compute the dashboard.
   *
   * @type {OrganizationDashboardPeriod}
   */
  readonly period: OrganizationDashboardPeriod;

  /**
   * Property overview
   * @readonly
   *
   * @description
   * Overview metrics grouped by backend-defined
   * dashboard sections.
   *
   * @type {OrganizationDashboardOverview}
   */
  readonly overview: OrganizationDashboardOverview;

  /**
   * Property health
   * @readonly
   *
   * @description
   * Health-oriented metrics associated with the
   * organization dashboard.
   *
   * @type {OrganizationDashboardHealth}
   */
  readonly health: OrganizationDashboardHealth;

  /**
   * Property alerts
   * @readonly
   *
   * @description
   * Alert entries surfaced by the dashboard for
   * items requiring attention.
   *
   * @type {readonly OrganizationDashboardAlert[]}
   */
  readonly alerts: readonly OrganizationDashboardAlert[];

  /**
   * Property comparison
   * @readonly
   *
   * @description
   * Comparison payload against the previous period,
   * when requested by the client.
   *
   * @type {OrganizationDashboardComparison}
   */
  readonly comparison: OrganizationDashboardComparison;

  /**
   * Property trends
   * @readonly
   *
   * @description
   * Optional embedded trend data included in the
   * aggregate dashboard response.
   *
   * @type {OrganizationDashboardTrends}
   */
  readonly trends?: OrganizationDashboardTrends;
  //#endregion
}
