import type { MetricComparison } from '@shared/components/metric-card';
import { WHOLE_NUMBER_FMT } from './dashboard-number-formatters.constants';

/**
 * Constant DEFAULT_COMPARISON
 * @const defaultComparison
 *
 * @description
 * Default comparison payload used when no change is detected
 * between current and previous values in dashboard summary metrics,
 * indicating a "Flat" trend with no direction.
 *
 * @type {MetricComparison}
 */
const DEFAULT_COMPARISON: MetricComparison = {
  value: 'Flat',
  direction: null,
};

/**
 * Function buildDashboardComparison
 * @function buildDashboardComparison
 *
 * @description
 * Builds the comparison payload consumed by metric cards from the current and
 * previous values displayed in dashboard summary tiles.
 *
 * @param {number} current - Current displayed value.
 * @param {number} previous - Previous-period displayed value.
 * @param {boolean} compareEnabled - Whether comparison mode is enabled.
 *
 * @returns {MetricComparison | null} The metric comparison payload, or null
 * when comparison is disabled.
 */
export function buildDashboardComparison(
  current: number,
  previous: number,
  compareEnabled: boolean,
): MetricComparison | null {
  if (!compareEnabled) return null;
  const delta: number = current - previous;

  if (delta === 0) return DEFAULT_COMPARISON;

  return {
    value: `${delta > 0 ? '+' : ''}${WHOLE_NUMBER_FMT.format(delta)}`,
    direction: delta > 0 ? 'up' : 'down',
  };
}
