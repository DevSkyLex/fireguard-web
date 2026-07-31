import type { ChartTooltipStyle } from '../../models';

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
 * Constant CHART_TOOLTIP_PALETTE
 *
 * @description
 * Per-theme colour set for the chart tooltip surface. Values mirror the app's
 * `surface-*` tokens exactly as used by the toast card
 * (`bg-surface-0 dark:bg-surface-900`, `border-surface-200 dark:border-surface-800`,
 * title `surface-950 / surface-50`, body `surface-500 / surface-400`) so the
 * tooltip reads as the same elevated surface as the rest of the app in both
 * light and dark themes.
 *
 * The Aura preset uses a different surface ramp per colour scheme — **slate**
 * (blue-tinted) in light and **zinc** (neutral grey) in dark — so the two rows
 * below intentionally come from different palettes rather than one shared ramp.
 *
 * @since 1.0.0
 */
const CHART_TOOLTIP_PALETTE = {
  light: { background: '#ffffff', title: '#020617', body: '#64748b', border: '#e2e8f0' },
  dark: { background: '#18181b', title: '#fafafa', body: '#a1a1aa', border: '#27272a' },
} as const;

/**
 * @function buildChartTooltipStyle
 *
 * @description
 * Builds the app-styled, theme-aware presentation options for a Chart.js
 * tooltip: an elevated `surface-0 / surface-900` card with a hairline border,
 * rounded corners, comfortable padding, circular series markers and the app's
 * Inter typography. Returns styling only — callers keep their own
 * `callbacks` for title/label formatting and spread this in.
 *
 * Pure: the theme is passed in (resolve it from `ThemeService.resolvedTheme()`)
 * so the result recomputes whenever the user switches theme.
 *
 * @param {boolean} isDark - Whether the dark theme is currently applied.
 * @returns {ChartTooltipStyle} The Chart.js tooltip style object to spread into `plugins.tooltip`.
 *
 * @since 1.0.0
 */
export function buildChartTooltipStyle(isDark: boolean): ChartTooltipStyle {
  const palette = isDark ? CHART_TOOLTIP_PALETTE.dark : CHART_TOOLTIP_PALETTE.light;

  return {
    backgroundColor: palette.background,
    titleColor: palette.title,
    bodyColor: palette.body,
    borderColor: palette.border,
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
