import type { MultiSeries, SingleSeries } from '@swimlane/ngx-charts';
import type { ChartSeries } from '../../models';

/**
 * Function toNgxMultiSeries
 *
 * @description
 * Maps the app's {@link ChartSeries} shape to ngx-charts' `MultiSeries` —
 * the format its line, area and grouped-bar renderers all consume — so a
 * caller of `line-chart` or `bar-chart` never builds that shape itself.
 *
 * @param {readonly ChartSeries[]} series - The series to convert.
 *
 * @returns {MultiSeries} The equivalent ngx-charts multi-series data.
 *
 * @since 1.0.0
 */
export function toNgxMultiSeries(series: readonly ChartSeries[]): MultiSeries {
  return series.map((entry) => ({
    name: entry.name,
    series: entry.points.map((point) => ({ name: point.label, value: point.value })),
  }));
}

/**
 * Function toNgxSingleSeries
 *
 * @description
 * Maps one {@link ChartSeries}' points to ngx-charts' `SingleSeries` — the
 * format its single-series bar renderer consumes.
 *
 * @param {ChartSeries} series - The series to convert.
 *
 * @returns {SingleSeries} The equivalent ngx-charts single-series data.
 *
 * @since 1.0.0
 */
export function toNgxSingleSeries(series: ChartSeries): SingleSeries {
  return series.points.map((point) => ({ name: point.label, value: point.value }));
}
