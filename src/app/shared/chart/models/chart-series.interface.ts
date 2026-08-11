import type { ChartPoint } from './chart-point.interface';

/**
 * Interface ChartSeries
 *
 * @description
 * One named line, area, or bar group — the shape every `shared/chart`
 * component accepts, so a caller never has to build ngx-charts' own
 * `Series` / `DataItem` types directly.
 *
 * @since 1.0.0
 */
export interface ChartSeries {
  readonly name: string;
  readonly points: readonly ChartPoint[];
}
