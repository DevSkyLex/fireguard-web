import type { ChartTooltipStyle } from '../../models';
import { resolveChartColor } from '../chart-palette/chart-palette.utils';

/**
 * Constant CHART_TOOLTIP_FONT_FAMILY
 *
 * @description
 * Font stack used inside canvas-drawn chart tooltips. Mirrors the app's
 * `--font-sans` token (Inter) so tooltips read with the same typography as the
 * surrounding UI. Chart.js renders on `<canvas>`, so the family must be passed
 * as an explicit string rather than inherited through CSS.
 *
 * @since 1.0.0
 */
const CHART_TOOLTIP_FONT_FAMILY = "'Inter Variable', ui-sans-serif, system-ui, sans-serif";

/**
 * @function buildChartTooltipStyle
 *
 * @description
 * Builds the app-styled, theme-aware presentation options for a Chart.js
 * tooltip: an elevated `surface-0 / surface-900` card with a hairline border,
 * rounded corners, comfortable padding, circular series markers and the app's
 * Inter typography. Colours are resolved live through `resolveChartColor`
 * (`utils/chart-palette`) — title takes the Heading Ink Rule pair
 * (`surface-950` light / pure-white `surface-0` dark, never `surface-50`) and
 * body mirrors the same muted step used by the axis tick labels
 * (`surface-500` light / `surface-400` dark). Returns styling only — callers
 * keep their own `callbacks` for title/label formatting and spread this in.
 *
 * Pure: the theme is passed in (resolve it from `ThemePort.resolvedTheme()`)
 * so the result recomputes whenever the user switches theme.
 *
 * @param {boolean} isDark - Whether the dark theme is currently applied.
 * @returns {ChartTooltipStyle} The Chart.js tooltip style object to spread into `plugins.tooltip`.
 *
 * @since 1.0.0
 */
export function buildChartTooltipStyle(isDark: boolean): ChartTooltipStyle {
  return {
    backgroundColor: resolveChartColor(isDark ? 'surface-900' : 'surface-0'),
    titleColor: resolveChartColor(isDark ? 'surface-0' : 'surface-950'),
    bodyColor: resolveChartColor(isDark ? 'surface-400' : 'surface-500'),
    borderColor: resolveChartColor(isDark ? 'surface-800' : 'surface-200'),
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    caretSize: 6,
    displayColors: true,
    usePointStyle: true,
    boxPadding: 6,
    titleMarginBottom: 6,
    titleFont: { family: CHART_TOOLTIP_FONT_FAMILY, size: 13, weight: 600 },
    bodyFont: { family: CHART_TOOLTIP_FONT_FAMILY, size: 12, weight: 500 },
  };
}
