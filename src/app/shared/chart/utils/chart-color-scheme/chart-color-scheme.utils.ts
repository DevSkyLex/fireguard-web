/**
 * The light-appearance categorical series palette, in series order. This is
 * the single source of truth for it: Chart.js's canvas 2D context never
 * resolves `var()` against a custom property, so the `--chart-1..6` tokens in
 * `src/styles.css` are documentation and this literal is what the canvas
 * reads (`core/theme`'s `ThemePort.resolvedTheme` doc comment states the same
 * rule for canvas/SVG chart consumers). Keep both in step.
 *
 * The six hues are the Bloc 3 deck's series (`DESIGN.md` §Colors, "Ember"):
 * orange, amber, emerald, cyan, violet, rose — the deck's intent being that
 * status colours are members of the series family, not neighbours of it. Slot
 * 1 is the brand orange itself, at the 600 rung so it holds ≥ 3:1 relief
 * against the warm paper card. Slots that fall under the 3:1 relief floor in
 * light mode (amber, cyan) are legal only because `line-chart` always renders
 * a text legend and a value tooltip, so a series is never told apart by hue
 * alone.
 */
const LIGHT_CHART_PALETTE: readonly string[] = [
  'oklch(0.646 0.194 41.1)',
  'oklch(0.666 0.179 58.3)',
  'oklch(0.596 0.145 163.2)',
  'oklch(0.609 0.126 221.7)',
  'oklch(0.58 0.2 293)',
  'oklch(0.6 0.21 17)',
];

/** The dark-appearance twin of {@link LIGHT_CHART_PALETTE} — the deck's six series verbatim (Tailwind 400 rung), which already sit in the dark lightness band against the `oklch(0.195 0.005 286)` card surface. */
const DARK_CHART_PALETTE: readonly string[] = [
  'oklch(0.705 0.187 47.6)',
  'oklch(0.837 0.164 84.4)',
  'oklch(0.773 0.153 163.2)',
  'oklch(0.797 0.134 211.5)',
  'oklch(0.709 0.159 293.5)',
  'oklch(0.719 0.169 13.4)',
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
