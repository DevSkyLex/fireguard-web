/**
 * The light-appearance categorical series palette, in series order. This is
 * the single source of truth for it — `src/styles.css` is off-limits to a
 * generated change (a repo guard hook blocks editing it outside the design
 * token workflow), and Chart.js's canvas 2D context never resolves `var()`
 * against a custom property, so a resolved literal is what it needs
 * (`core/theme`'s `ThemePort.resolvedTheme` doc comment states the same rule
 * for canvas/SVG chart consumers).
 *
 * Chroma sits in the 0.14–0.20 vibrant band (raised from the previous
 * 0.09–0.13 wash) and slot 1 (indigo, hue ≈272) deliberately echoes the
 * `#4f46e5` brand mark (`PRODUCT.md` Brand Commitments) — the interface's
 * chromatic accent is retired everywhere except the mark and this tolerated
 * data-viz exception, so the first series is where the product's own colour
 * legitimately shows up. Every slot and its {@link DARK_CHART_PALETTE} twin
 * pass `scripts/validate_palette.js` (dataviz skill) on the adjacent
 * pairlist — lightness band, chroma floor, CVD ΔE ≥ 8, normal-vision ΔE ≥ 15
 * — against this app's actual `--card` surface (`#ffffff` light, `#171717`
 * dark), not the skill's placeholder surface. Three light-mode slots (teal,
 * amber, magenta) sit under the 3:1 relief floor by design — legal only
 * because `line-chart` always renders a text legend and a value tooltip, so
 * a series is never told apart by hue alone.
 */
const LIGHT_CHART_PALETTE: readonly string[] = [
  'oklch(0.53 0.20 272)',
  'oklch(0.67 0.19 41)',
  'oklch(0.67 0.14 162)',
  'oklch(0.76 0.155 75)',
  'oklch(0.70 0.17 357)',
  'oklch(0.55 0.17 142)',
];

/** The dark-appearance twin of {@link LIGHT_CHART_PALETTE} — same six hues re-stepped into the dark lightness band (OKLCH L 0.48–0.67) and validated against the `#171717` dark card surface, not a uniform lift of the light values. */
const DARK_CHART_PALETTE: readonly string[] = [
  'oklch(0.62 0.18 272)',
  'oklch(0.62 0.17 41)',
  'oklch(0.62 0.13 162)',
  'oklch(0.665 0.135 75)',
  'oklch(0.62 0.16 357)',
  'oklch(0.55 0.17 142)',
];

/**
 * Function resolveChartColorScheme
 *
 * @description
 * The ordinal categorical palette a `shared/chart` component draws its
 * dataset colours from, picked from the resolved appearance rather than read
 * off the DOM. Pure and SSR-safe: it takes the already-resolved
 * `'light' | 'dark'` value instead of reading `--chart-*` custom properties
 * itself.
 *
 * @param {'light' | 'dark'} resolvedTheme - The applied appearance, `'system'` already resolved.
 *
 * @returns {readonly string[]} An ordinal series palette, in series order.
 *
 * @since 1.0.0
 */
export function resolveChartColorScheme(resolvedTheme: 'light' | 'dark'): readonly string[] {
  return resolvedTheme === 'dark' ? DARK_CHART_PALETTE : LIGHT_CHART_PALETTE;
}
