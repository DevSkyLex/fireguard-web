import type { ChartPaletteToken } from '@features/organization/ui/components/organization-dashboard/models';

/**
 * Constant CHART_PALETTE_CSS_VAR
 *
 * @description
 * Maps each {@link ChartPaletteToken} to the CSS custom property PrimeNG (the
 * `primary` / `surface` ramps, verified against `core/primeng/presets/fireguard.preset.ts`)
 * or Tailwind v4's own default theme (the four-tone status vocabulary) publishes
 * on `document.documentElement`. `primary` reads the theme-aware semantic alias
 * (`--p-primary-color`, `{primary.600}` light / `{primary.400}` dark) so it
 * re-resolves correctly per theme with no branching here; every other token is a
 * literal, theme-invariant ramp step, and the caller picks the step that matches
 * the active theme (mirroring a template's own `dark:` variant).
 *
 * @since 1.0.0
 *
 * @type {Record<ChartPaletteToken, string>}
 */
const CHART_PALETTE_CSS_VAR: Record<ChartPaletteToken, string> = {
  primary: '--p-primary-color',
  'primary-hover': '--p-primary-hover-color',
  'primary-300': '--p-primary-300',
  'surface-0': '--p-surface-0',
  'surface-50': '--p-surface-50',
  'surface-100': '--p-surface-100',
  'surface-200': '--p-surface-200',
  'surface-300': '--p-surface-300',
  'surface-400': '--p-surface-400',
  'surface-500': '--p-surface-500',
  'surface-700': '--p-surface-700',
  'surface-800': '--p-surface-800',
  'surface-900': '--p-surface-900',
  'surface-950': '--p-surface-950',
  'green-500': '--color-green-500',
  'blue-500': '--color-blue-500',
  'amber-500': '--color-amber-500',
  'red-500': '--color-red-500',
};

/**
 * Constant CHART_PALETTE_FALLBACK
 *
 * @description
 * Literal light-mode values used only when the CSS custom property cannot be
 * read: during SSR evaluation (no `document`) or, defensively, if a property
 * has not resolved (e.g. a detached test DOM). Mirrors DESIGN.md's documented
 * hex values exactly, so a fallback render is never a guess. `primary` falls
 * back to its light-mode step because `ThemeService` itself resolves to
 * `'light'` on the server (see `core/theme`).
 *
 * @since 1.0.0
 *
 * @type {Record<ChartPaletteToken, string>}
 */
const CHART_PALETTE_FALLBACK: Record<ChartPaletteToken, string> = {
  primary: '#4f46e5',
  'primary-hover': '#4338ca',
  'primary-300': '#a5b4fc',
  'surface-0': '#ffffff',
  'surface-50': '#fafafa',
  'surface-100': '#f5f5f5',
  'surface-200': '#e5e5e5',
  'surface-300': '#d4d4d4',
  'surface-400': '#a3a3a3',
  'surface-500': '#737373',
  'surface-700': '#404040',
  'surface-800': '#262626',
  'surface-900': '#171717',
  'surface-950': '#0a0a0a',
  'green-500': '#22c55e',
  'blue-500': '#3b82f6',
  'amber-500': '#f59e0b',
  'red-500': '#ef4444',
};

/**
 * @function resolveChartColor
 *
 * @description
 * Resolves a {@link ChartPaletteToken} to its concrete CSS colour value at call
 * time, read live from `document.documentElement` so the result always matches
 * the design-token preset instead of duplicating a hex value that can drift
 * from it. Chart.js renders on `<canvas>`, which cannot consume `var(--token)`
 * references, so every chart must resolve tokens to a literal colour string
 * before handing it to a dataset or scale option. Falls back to
 * {@link CHART_PALETTE_FALLBACK} under SSR (no `document`) or when the
 * property has not resolved.
 *
 * Pure with respect to its input: call this inside a `computed()` that also
 * reads the current theme (see `ThemePort.resolvedTheme()`) so chart colours
 * re-resolve on every theme toggle.
 *
 * @param {ChartPaletteToken} token - The design-token key to resolve.
 * @returns {string} A concrete CSS colour value (hex or `oklch(...)`, matching
 *   how the source token is published) usable directly as a Chart.js colour.
 *
 * @since 1.0.0
 */
export function resolveChartColor(token: ChartPaletteToken): string {
  if (typeof document === 'undefined') return CHART_PALETTE_FALLBACK[token];

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(CHART_PALETTE_CSS_VAR[token])
    .trim();

  return value.length > 0 ? value : CHART_PALETTE_FALLBACK[token];
}

/**
 * @function withChartAlpha
 *
 * @description
 * Returns a translucent variant of a resolved chart colour, for soft area
 * fills and de-emphasized comparison series. Handles both colour formats
 * {@link resolveChartColor} can return: a `#rrggbb` hex (the `primary` and
 * `surface-*` tokens) becomes `rgba(r, g, b, alpha)`; an `oklch(L C H)` string
 * (Tailwind v4's default palette, backing the four-tone status tokens) gets
 * its alpha channel appended as `oklch(L C H / alpha)`, valid CSS Color 4
 * syntax that both `<canvas>` and every browser this app supports render
 * correctly. Any other input is returned unchanged rather than guessed at.
 *
 * @param {string} color - A colour string previously resolved by {@link resolveChartColor}.
 * @param {number} alpha - Alpha channel in the range `[0, 1]`.
 * @returns {string} The translucent colour, or `color` unchanged if its format is not recognized.
 *
 * @since 1.0.0
 */
export function withChartAlpha(color: string, alpha: number): string {
  const hexMatch = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (hexMatch) {
    const [, redHex, greenHex, blueHex] = hexMatch;
    const red = parseInt(redHex, 16);
    const green = parseInt(greenHex, 16);
    const blue = parseInt(blueHex, 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const oklchMatch = /^oklch\(([^)]+)\)$/i.exec(color);
  if (oklchMatch) {
    return `oklch(${oklchMatch[1]} / ${alpha})`;
  }

  return color;
}
