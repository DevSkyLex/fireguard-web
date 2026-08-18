import type { ChartPoint } from './chart-point.interface';

/**
 * Interface ChartSeries
 *
 * @description
 * One named line or area — the shape every `shared/chart` component
 * accepts, so a caller never has to build Chart.js' own dataset shape
 * directly.
 *
 * @since 1.0.0
 */
export interface ChartSeries {
  readonly name: string;
  readonly points: readonly ChartPoint[];
}
