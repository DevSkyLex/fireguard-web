import type { ChartData, ScriptableContext } from 'chart.js';
import type { DashboardSingleTrendViewModel } from '@features/organization/ui/components/organization-statistics-panel/models';
import { withChartAlpha } from '../chart-palette/chart-palette.utils';

/**
 * Constant DEFAULT_COMPARISON_LABEL
 *
 * @description
 * Fallback dataset label used for the previous-period series when the caller
 * does not supply an explicit comparison label.
 *
 * @type {string}
 */
const DEFAULT_COMPARISON_LABEL: string = $localize`:@@dash.previousPeriod:Previous Period`;

/**
 * Type BuildDashboardSingleTrendLineChartDataOptions
 *
 * @description
 * Parameter bag for {@link buildDashboardSingleTrendLineChartData}.
 * Carries the view model, labelling strings, and colour tokens used to
 * construct the Chart.js line payload for a single-series dashboard card.
 * Colour values are expected to already be resolved through
 * `resolveChartColor` (`utils/chart-palette`) — this builder only shapes the
 * Chart.js payload, it does not know about design tokens. `pointHoverBorderColor`
 * is required rather than defaulted so no caller can silently fall back to a
 * hard-coded ring colour that ignores the active theme.
 */
type BuildDashboardSingleTrendLineChartDataOptions = {
  readonly viewModel: DashboardSingleTrendViewModel;
  readonly label: string;
  readonly currentColor: string;
  readonly pointHoverBorderColor: string;
  readonly comparisonLabel?: string;
  readonly comparisonColor?: string;
};

/**
 * Function buildLineGradientBackground
 *
 * @description
 * Returns a Chart.js scriptable background factory that paints a vertical
 * linear gradient from a semi-transparent version of `color` at the top of
 * the chart area down to fully transparent at the bottom.
 * Used to produce the soft fill beneath line datasets.
 *
 * @param {string} color - Resolved colour (hex or `oklch(...)`) used as the gradient base.
 * @returns {(context: ScriptableContext<'line'>) => string | CanvasGradient}
 *   A scriptable background callback compatible with Chart.js datasets.
 */
function buildLineGradientBackground(
  color: string,
): (context: ScriptableContext<'line'>) => string | CanvasGradient {
  const transparentColor = withChartAlpha(color, 0);
  const opaqueColor = withChartAlpha(color, 0.25);

  return (context: ScriptableContext<'line'>) => {
    const { ctx, chartArea } = context.chart;

    if (!chartArea) return transparentColor;

    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);

    gradient.addColorStop(0, opaqueColor);
    gradient.addColorStop(1, transparentColor);

    return gradient;
  };
}

/**
 * Function buildDashboardSingleTrendLineChartData
 *
 * @description
 * Builds the standard Chart.js line payload used by dashboard cards backed by
 * a single current-period series and an optional previous-period comparison.
 *
 * @param {BuildDashboardSingleTrendLineChartDataOptions} options - Line chart configuration.
 * @returns {ChartData<'line'>} The Chart.js data payload.
 */
export function buildDashboardSingleTrendLineChartData({
  viewModel,
  label,
  currentColor,
  pointHoverBorderColor,
  comparisonLabel = DEFAULT_COMPARISON_LABEL,
  comparisonColor = withChartAlpha(currentColor, 0.4),
}: BuildDashboardSingleTrendLineChartDataOptions): ChartData<'line'> {
  const datasets: ChartData<'line'>['datasets'] = [
    {
      label,
      data: viewModel.currentValues,
      borderColor: currentColor,
      backgroundColor: buildLineGradientBackground(currentColor),
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBorderWidth: 2,
      pointHoverBorderColor,
      pointHoverBackgroundColor: currentColor,
      fill: 'origin',
    },
  ];

  if (viewModel.compareEnabled && viewModel.hasComparisonData) {
    datasets.push({
      label: comparisonLabel,
      data: viewModel.comparisonValues,
      borderColor: comparisonColor,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [4, 4],
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBorderWidth: 2,
      pointHoverBorderColor,
      pointHoverBackgroundColor: comparisonColor,
      fill: false,
    });
  }

  return {
    labels: [...viewModel.labels],
    datasets,
  };
}
