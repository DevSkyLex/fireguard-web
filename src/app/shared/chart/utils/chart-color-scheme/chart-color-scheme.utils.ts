import { ScaleType, type Color } from '@swimlane/ngx-charts';

/**
 * The light-appearance categorical series palette, in series order. This is
 * the single source of truth for it — `src/styles.css` is off-limits to a
 * generated change (a repo guard hook blocks editing it outside the design
 * token workflow), and ngx-charts renders SVG fill attributes it never
 * resolves `var()` against in any case, so a resolved literal is what it
 * needs (`core/theme`'s `ThemePort.resolvedTheme` doc comment states the
 * same rule for canvas/SVG chart consumers).
 */
const LIGHT_CHART_PALETTE: readonly string[] = [
  'oklch(0.58 0.10 230)',
  'oklch(0.60 0.11 170)',
  'oklch(0.68 0.13 95)',
  'oklch(0.60 0.11 320)',
  'oklch(0.55 0.09 30)',
  'oklch(0.50 0.02 250)',
];

/** The dark-appearance twin of {@link LIGHT_CHART_PALETTE}, lifted for contrast on a dark surface. */
const DARK_CHART_PALETTE: readonly string[] = [
  'oklch(0.75 0.11 230)',
  'oklch(0.78 0.12 170)',
  'oklch(0.82 0.13 95)',
  'oklch(0.78 0.12 320)',
  'oklch(0.72 0.10 30)',
  'oklch(0.70 0.02 250)',
];

/**
 * Function resolveChartColorScheme
 *
 * @description
 * The ordinal categorical scheme a `shared/chart` component feeds ngx-charts'
 * `[scheme]` input, picked from the resolved appearance rather than read off
 * the DOM. Pure and SSR-safe: it takes the already-resolved `'light' | 'dark'`
 * value instead of reading `--chart-*` custom properties itself.
 *
 * @param {'light' | 'dark'} resolvedTheme - The applied appearance, `'system'` already resolved.
 *
 * @returns {Color} An ordinal color scheme ngx-charts can consume directly.
 *
 * @since 1.0.0
 */
export function resolveChartColorScheme(resolvedTheme: 'light' | 'dark'): Color {
  return {
    name: 'fireguard-chart',
    selectable: false,
    group: ScaleType.Ordinal,
    domain: resolvedTheme === 'dark' ? [...DARK_CHART_PALETTE] : [...LIGHT_CHART_PALETTE],
  };
}
