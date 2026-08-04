/**
 * Type ChartPaletteToken
 *
 * @description
 * Named design-token keys the dashboard trend charts may resolve to a concrete
 * CSS colour value through `resolveChartColor` (`utils/chart-palette`). Mirrors
 * the DESIGN.md Charts vocabulary: the theme-aware accent and its hover step
 * (`primary`, `primary-hover`), its lightened step for temporal comparisons
 * (`primary-300`), the neutral `surface-*` ramp for chrome (axes, grids,
 * tooltips, hover rings, categorical secondary series), and the four-tone
 * status vocabulary (`green-500` / `blue-500` / `amber-500` / `red-500`) for
 * status-classified series.
 *
 * @since 1.0.0
 */
export type ChartPaletteToken =
  | 'primary'
  | 'primary-hover'
  | 'primary-300'
  | 'surface-0'
  | 'surface-50'
  | 'surface-100'
  | 'surface-200'
  | 'surface-300'
  | 'surface-400'
  | 'surface-500'
  | 'surface-700'
  | 'surface-800'
  | 'surface-900'
  | 'surface-950'
  | 'green-500'
  | 'blue-500'
  | 'amber-500'
  | 'red-500';
