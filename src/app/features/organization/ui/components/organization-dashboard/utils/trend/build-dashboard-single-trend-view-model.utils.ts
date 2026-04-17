import {
  getDashboardTrendSeriesValues,
  sumDashboardTrendValues,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import type { OrganizationDashboardTrendOutput } from '@features/organization/models';
import type {
  DashboardSingleTrendViewModel,
  DashboardSummaryMetric,
} from '@features/organization/ui/components/organization-dashboard/models';
import { buildDashboardComparison, WHOLE_NUMBER_FMT } from '../metrics';

/**
 * Type BuildDashboardSingleTrendSummaryMetricOptions
 *
 * @description
 * Parameter bag for {@link buildDashboardSingleTrendSummaryMetric}.
 * Supplies the normalised view model, display label, icon name, and an
 * optional value formatter used when building a single-series KPI tile.
 */
type BuildDashboardSingleTrendSummaryMetricOptions = {
  readonly viewModel: DashboardSingleTrendViewModel;
  readonly label: string;
  readonly icon: string | null;
  readonly formatValue?: (value: number) => string;
};

/**
 * Function buildDashboardSingleTrendViewModel
 *
 * @description
 * Converts a raw single-endpoint dashboard trend payload into a compact view
 * model tailored for KPI cards and chart rendering.
 *
 * @param {OrganizationDashboardTrendOutput | null | undefined} trend
 *   The raw trend resource loaded by the dashboard card store.
 * @param {boolean} compareEnabled - Whether previous-period comparison is enabled.
 * @returns {DashboardSingleTrendViewModel} The normalized view model.
 */
export function buildDashboardSingleTrendViewModel(
  trend: OrganizationDashboardTrendOutput | null | undefined,
  compareEnabled: boolean,
): DashboardSingleTrendViewModel {
  const currentValues = getDashboardTrendSeriesValues(trend?.series);
  const comparisonValues = getDashboardTrendSeriesValues(trend?.comparison?.series);

  return {
    labels: currentValues.map(() => ''),
    currentValues,
    comparisonValues,
    total: sumDashboardTrendValues(currentValues),
    previousTotal: sumDashboardTrendValues(comparisonValues),
    compareEnabled,
    hasComparisonData: comparisonValues.length > 0,
  };
}

/**
 * Function buildDashboardSingleTrendSummaryMetric
 *
 * @description
 * Builds the single KPI tile commonly displayed above single-series trend
 * charts, including optional previous-period comparison.
 *
 * @param {BuildDashboardSingleTrendSummaryMetricOptions} options - Summary metric configuration.
 * @returns {DashboardSummaryMetric} The summary metric payload.
 */
export function buildDashboardSingleTrendSummaryMetric({
  viewModel,
  label,
  icon,
  formatValue = (value: number) => WHOLE_NUMBER_FMT.format(value),
}: BuildDashboardSingleTrendSummaryMetricOptions): DashboardSummaryMetric {
  return {
    label,
    value: formatValue(viewModel.total),
    icon,
    comparison: buildDashboardComparison(
      viewModel.total,
      viewModel.previousTotal,
      viewModel.compareEnabled,
    ),
  };
}
