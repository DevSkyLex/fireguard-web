import type { AlignedDashboardTrendSeries } from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import type { ChartSeries } from '@shared/chart';
import { mapAlignedDashboardTrendSeriesToChartSeries } from '../organization-dashboard-trend-chart.utils';

describe('organization-dashboard-trend-chart utils', () => {
  describe('mapAlignedDashboardTrendSeriesToChartSeries', () => {
    const aligned: AlignedDashboardTrendSeries = {
      buckets: ['2026-01-01', '2026-01-02'],
      labels: ['01 Jan 2026', '02 Jan 2026'],
      datasets: [
        [3, 5],
        [1, 2],
      ],
    };

    it('names each requested dataset and pairs it with the shared label axis', () => {
      const result: ChartSeries[] = mapAlignedDashboardTrendSeriesToChartSeries(aligned, [
        { name: 'Inspections', index: 0 },
      ]);

      expect(result).toEqual([
        {
          name: 'Inspections',
          points: [
            { label: '01 Jan 2026', value: 3 },
            { label: '02 Jan 2026', value: 5 },
          ],
        },
      ]);
    });

    it('maps more than one requested index into separate named series', () => {
      const result: ChartSeries[] = mapAlignedDashboardTrendSeriesToChartSeries(aligned, [
        { name: 'Opened', index: 0 },
        { name: 'Resolved', index: 1 },
      ]);

      expect(result.map((series) => series.name)).toEqual(['Opened', 'Resolved']);
      expect(result[1]?.points.map((point) => point.value)).toEqual([1, 2]);
    });

    it('zero-fills a requested index the aligned data does not carry', () => {
      const result: ChartSeries[] = mapAlignedDashboardTrendSeriesToChartSeries(aligned, [
        { name: 'Missing', index: 5 },
      ]);

      expect(result).toEqual([
        {
          name: 'Missing',
          points: [
            { label: '01 Jan 2026', value: 0 },
            { label: '02 Jan 2026', value: 0 },
          ],
        },
      ]);
    });

    it('returns an empty array when no series were requested', () => {
      expect(mapAlignedDashboardTrendSeriesToChartSeries(aligned, [])).toEqual([]);
    });

    it('returns no points when the aligned axis is empty', () => {
      const empty: AlignedDashboardTrendSeries = { buckets: [], labels: [], datasets: [[]] };

      expect(
        mapAlignedDashboardTrendSeriesToChartSeries(empty, [{ name: 'Inspections', index: 0 }]),
      ).toEqual([{ name: 'Inspections', points: [] }]);
    });
  });
});
