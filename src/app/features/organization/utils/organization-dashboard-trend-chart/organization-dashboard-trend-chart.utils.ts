import type { AlignedDashboardTrendSeries } from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import type { ChartSeries } from '@shared/chart';

/**
 * Function mapAlignedDashboardTrendSeriesToChartSeries
 *
 * @description
 * Maps an {@link AlignedDashboardTrendSeries} produced by the dashboard trend
 * stores to the `ChartSeries[]` shape `shared/chart`'s line/bar components
 * accept, picking out and naming only the dataset indices a given chart card
 * wants to plot.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {AlignedDashboardTrendSeries} aligned - The aligned bucket axis and datasets from a trend store.
 * @param {ReadonlyArray<{ readonly name: string; readonly index: number }>} series - Which dataset indices to plot, and the localized name each renders under.
 *
 * @returns {ChartSeries[]} One named series per requested dataset index.
 */
export function mapAlignedDashboardTrendSeriesToChartSeries(
  aligned: AlignedDashboardTrendSeries,
  series: ReadonlyArray<{ readonly name: string; readonly index: number }>,
): ChartSeries[] {
  return series.map(({ name, index }) => ({
    name,
    points: aligned.labels.map((label, pointIndex) => ({
      label,
      value: aligned.datasets[index]?.[pointIndex] ?? 0,
    })),
  }));
}
