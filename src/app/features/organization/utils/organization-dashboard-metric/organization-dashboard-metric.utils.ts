import type { NonConformitySeverity } from '@features/organization/features/inspections/models';
import type {
  OrganizationDashboardComparison,
  OrganizationDashboardHealth,
  OrganizationDashboardOverview,
} from '@features/organization/models';

/**
 * Constant NON_CONFORMITY_SEVERITY_METRIC_KEYS
 *
 * @description
 * Maps each non-conformity severity to the `overview.nonConformities`
 * summary key the backend reports its current open+unresolved count under
 * (`GetOrganizationDashboardProvider::normalizeOverview`).
 *
 * @since 1.0.0
 */
const NON_CONFORMITY_SEVERITY_METRIC_KEYS: Readonly<Record<NonConformitySeverity, string>> = {
  low: 'severityLow',
  medium: 'severityMedium',
  high: 'severityHigh',
  critical: 'severityCritical',
};

/**
 * Function getOrganizationDashboardOverviewMetricValue
 *
 * @description
 * Reads one numeric entry out of a dashboard overview widget's loosely-typed
 * `summary` array by its backend-defined key, e.g. `('nonConformities',
 * 'open')`. Returns `null` when the widget, the entry, or a numeric value is
 * absent — a caller lacking the section's permission gets an absent widget
 * rather than a thrown error.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {OrganizationDashboardOverview | undefined} overview - The dashboard payload's `overview` map.
 * @param {string} widgetKey - The overview section, e.g. `'nonConformities'`.
 * @param {string} metricKey - The summary entry's key, e.g. `'open'`.
 *
 * @returns {number | null} The metric's numeric value, or `null`.
 */
export function getOrganizationDashboardOverviewMetricValue(
  overview: OrganizationDashboardOverview | undefined,
  widgetKey: string,
  metricKey: string,
): number | null {
  const summary = overview?.[widgetKey]?.['summary'];
  const entry = summary?.find((item) => item['key'] === metricKey);
  const value = entry?.['value'];

  return typeof value === 'number' ? value : null;
}

/**
 * Function getOrganizationDashboardNonConformitySeverityBreakdown
 *
 * @description
 * Resolves the current open+unresolved non-conformity count for every
 * severity level, ordered from most to least urgent, from the dashboard's
 * `overview.nonConformities` widget.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {OrganizationDashboardOverview | undefined} overview - The dashboard payload's `overview` map.
 *
 * @returns {ReadonlyArray<{ readonly severity: NonConformitySeverity; readonly count: number }>} One entry per severity, zero-filled when absent.
 */
export function getOrganizationDashboardNonConformitySeverityBreakdown(
  overview: OrganizationDashboardOverview | undefined,
): ReadonlyArray<{ readonly severity: NonConformitySeverity; readonly count: number }> {
  const severities: readonly NonConformitySeverity[] = ['critical', 'high', 'medium', 'low'];

  return severities.map((severity) => ({
    severity,
    count:
      getOrganizationDashboardOverviewMetricValue(
        overview,
        'nonConformities',
        NON_CONFORMITY_SEVERITY_METRIC_KEYS[severity],
      ) ?? 0,
  }));
}

/**
 * Function getOrganizationDashboardHealthValue
 *
 * @description
 * Reads one metric's current value out of the dashboard's `health.metrics`
 * list by its backend-defined key, e.g. `'nonConformityResolutionRate'`. Every
 * health metric is a 0–100 percentage.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {OrganizationDashboardHealth | undefined} health - The dashboard payload's `health` map.
 * @param {string} metricKey - The health metric's key.
 *
 * @returns {number | null} The metric's percentage value, or `null` when absent.
 */
export function getOrganizationDashboardHealthValue(
  health: OrganizationDashboardHealth | undefined,
  metricKey: string,
): number | null {
  const metrics = health?.['metrics'];
  const entry = metrics?.find((item) => item['key'] === metricKey);
  const value = entry?.['value'];

  return typeof value === 'number' ? value : null;
}

/**
 * Function getOrganizationDashboardHealthComparisonDelta
 *
 * @description
 * Reads one health metric's period-over-period delta out of
 * `comparison.health.metrics`. `null` when the dashboard was fetched without
 * a comparison period, or the metric carries no delta.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {OrganizationDashboardComparison | undefined} comparison - The dashboard payload's `comparison` block.
 * @param {string} metricKey - The health metric's key.
 *
 * @returns {{ readonly delta: number; readonly direction: string } | null} The signed delta in percentage points and its literal direction, or `null`.
 */
export function getOrganizationDashboardHealthComparisonDelta(
  comparison: OrganizationDashboardComparison | undefined,
  metricKey: string,
): { readonly delta: number; readonly direction: string } | null {
  const metrics = comparison?.health?.['metrics'];
  const entry = metrics?.find((item) => item['key'] === metricKey);
  const delta = entry?.['delta'];
  const direction = entry?.['direction'];

  if (typeof delta !== 'number' || typeof direction !== 'string') return null;

  return { delta, direction };
}
