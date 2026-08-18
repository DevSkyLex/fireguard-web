/**
 * The light-appearance chrome literal, mirroring `src/styles.css`'
 * `--border`, `--muted-foreground`, `--popover` and `--popover-foreground`
 * tokens. A resolved literal, not a `var()` reference: Chart.js paints grid
 * lines, tick labels and the tooltip box on the canvas 2D context, which
 * never resolves a custom property (`chart-color-scheme.utils.ts` states the
 * same rule for the series palette).
 *
 * `border` carries alpha so the gridline reads as a faint recessive hairline
 * rather than a full-contrast rule — `line-chart` also draws it on the
 * horizontal (y) axis only, never the vertical, which is the bigger part of
 * a modern, uncaged plot.
 */
const LIGHT_CHART_GRID = {
  border: 'oklch(0.922 0 0 / 60%)',
  tick: 'oklch(0.556 0 0)',
  tooltipBackground: 'oklch(1 0 0)',
  tooltipForeground: 'oklch(0.145 0 0)',
} as const;

/** The dark-appearance twin of {@link LIGHT_CHART_GRID}. */
const DARK_CHART_GRID = {
  border: 'oklch(1 0 0 / 8%)',
  tick: 'oklch(0.708 0 0)',
  tooltipBackground: 'oklch(0.205 0 0)',
  tooltipForeground: 'oklch(0.985 0 0)',
} as const;

/**
 * Function resolveChartGridColors
 *
 * @description
 * The literal grid line, tick label and tooltip chrome colours a
 * `shared/chart` component feeds Chart.js' `scales`/`plugins` options,
 * picked from the resolved appearance. Pure and SSR-safe, mirroring
 * {@link resolveChartColorScheme}.
 *
 * @param {'light' | 'dark'} resolvedTheme - The applied appearance, `'system'` already resolved.
 *
 * @returns {{ readonly border: string; readonly tick: string; readonly tooltipBackground: string; readonly tooltipForeground: string }}
 * The resolved chrome colours.
 *
 * @since 1.0.0
 */
export function resolveChartGridColors(resolvedTheme: 'light' | 'dark'): {
  readonly border: string;
  readonly tick: string;
  readonly tooltipBackground: string;
  readonly tooltipForeground: string;
} {
  return resolvedTheme === 'dark' ? DARK_CHART_GRID : LIGHT_CHART_GRID;
}
