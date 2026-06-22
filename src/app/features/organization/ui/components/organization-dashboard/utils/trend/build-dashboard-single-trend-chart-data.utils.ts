import type { ChartData, ScriptableContext } from 'chart.js';
import type { DashboardSingleTrendViewModel } from '@features/organization/ui/components/organization-dashboard/models';

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
 * Type BuildDashboardSingleTrendBarChartDataOptions
 *
 * @description
 * Parameter bag for {@link buildDashboardSingleTrendBarChartData}.
 * Carries the view model, labelling strings, and colour tokens used to
 * construct the Chart.js bar payload for a single-series dashboard card.
 */
type BuildDashboardSingleTrendBarChartDataOptions = {
  readonly viewModel: DashboardSingleTrendViewModel;
  readonly label: string;
  readonly currentBackgroundColor: string;
  readonly currentHoverBackgroundColor?: string;
  readonly comparisonLabel?: string;
  readonly comparisonBackgroundColor: string;
  readonly comparisonHoverBackgroundColor?: string;
};

/**
 * Type BuildDashboardSingleTrendLineChartDataOptions
 *
 * @description
 * Parameter bag for {@link buildDashboardSingleTrendLineChartData}.
 * Carries the view model, labelling strings, and colour tokens used to
 * construct the Chart.js line payload for a single-series dashboard card.
 */
type BuildDashboardSingleTrendLineChartDataOptions = {
  readonly viewModel: DashboardSingleTrendViewModel;
  readonly label: string;
  readonly currentColor: string;
  readonly comparisonLabel?: string;
  readonly comparisonColor?: string;
};

/**
 * Function getHexRgbChannels
 *
 * @description
 * Parses a hex colour string into its three RGB integer channels.
 * Returns `null` when the input cannot be parsed as a valid six-digit hex colour.
 *
 * @param {string} hexColor - Hex colour string (with or without leading `#`).
 * @returns {[number, number, number] | null} Tuple of `[red, green, blue]` values,
 *   or `null` if the string is not a valid six-digit hex colour.
 */
function getHexRgbChannels(hexColor: string): [number, number, number] | null {
  const normalizedHex = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(normalizedHex);

  if (!match) return null;

  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

/**
 * Function toRgbaColor
 *
 * @description
 * Converts a hex colour string to an `rgba(...)` CSS value with the given
 * alpha channel. Falls back to the original string when the hex cannot be parsed.
 *
 * @param {string} hexColor - Hex colour string (with or without leading `#`).
 * @param {number} alpha - Alpha channel value in the range `[0, 1]`.
 * @returns {string} The `rgba(r, g, b, alpha)` string, or the original `hexColor`
 *   if parsing fails.
 */
function toRgbaColor(hexColor: string, alpha: number): string {
  const rgbChannels = getHexRgbChannels(hexColor);

  if (!rgbChannels) return hexColor;

  const [red, green, blue] = rgbChannels;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Function buildLineGradientBackground
 *
 * @description
 * Returns a Chart.js scriptable background factory that paints a vertical
 * linear gradient from a semi-transparent version of `color` at the top of
 * the chart area down to fully transparent at the bottom.
 * Used to produce the soft fill beneath line datasets.
 *
 * @param {string} color - Hex colour string used as the gradient base.
 * @returns {(context: ScriptableContext<'line'>) => string | CanvasGradient}
 *   A scriptable background callback compatible with Chart.js datasets.
 */
function buildLineGradientBackground(
  color: string,
): (context: ScriptableContext<'line'>) => string | CanvasGradient {
  const transparentColor = toRgbaColor(color, 0);
  const opaqueColor = toRgbaColor(color, 0.25);

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
 * Function buildDashboardSingleTrendBarChartData
 *
 * @description
 * Builds the standard Chart.js bar payload used by dashboard cards backed by
 * a single current-period series and an optional previous-period comparison.
 *
 * @param {BuildDashboardSingleTrendBarChartDataOptions} options - Bar chart configuration.
 * @returns {ChartData<'bar'>} The Chart.js data payload.
 */
export function buildDashboardSingleTrendBarChartData({
  viewModel,
  label,
  currentBackgroundColor,
  currentHoverBackgroundColor = currentBackgroundColor,
  comparisonLabel = DEFAULT_COMPARISON_LABEL,
  comparisonBackgroundColor,
  comparisonHoverBackgroundColor = comparisonBackgroundColor,
}: BuildDashboardSingleTrendBarChartDataOptions): ChartData<'bar'> {
  const datasets: ChartData<'bar'>['datasets'] = [
    {
      label,
      data: viewModel.currentValues,
      backgroundColor: currentBackgroundColor,
      hoverBackgroundColor: currentHoverBackgroundColor,
    },
  ];

  if (viewModel.compareEnabled && viewModel.hasComparisonData) {
    datasets.push({
      label: comparisonLabel,
      data: viewModel.comparisonValues,
      backgroundColor: comparisonBackgroundColor,
      hoverBackgroundColor: comparisonHoverBackgroundColor,
    });
  }

  return {
    labels: [...viewModel.labels],
    datasets,
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
  comparisonLabel = DEFAULT_COMPARISON_LABEL,
  comparisonColor = toRgbaColor(currentColor, 0.4),
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
      pointHoverBorderColor: '#fff',
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
      pointHoverBorderColor: '#fff',
      pointHoverBackgroundColor: comparisonColor,
      fill: false,
    });
  }

  return {
    labels: [...viewModel.labels],
    datasets,
  };
}
