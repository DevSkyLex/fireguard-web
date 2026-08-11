import type { MultiSeries, SingleSeries } from '@swimlane/ngx-charts';
import type { ChartSeries } from '@shared/chart';
import { toNgxMultiSeries, toNgxSingleSeries } from '../chart-series-mapper.utils';

describe('chart-series-mapper utils', () => {
  describe('toNgxMultiSeries', () => {
    it('maps each series to its name and points', () => {
      const series: readonly ChartSeries[] = [
        {
          name: 'Inspections',
          points: [
            { label: 'Jan', value: 3 },
            { label: 'Feb', value: 5 },
          ],
        },
        {
          name: 'Non-conformities',
          points: [{ label: 'Jan', value: 1 }],
        },
      ];

      const result: MultiSeries = toNgxMultiSeries(series);

      expect(result).toEqual([
        {
          name: 'Inspections',
          series: [
            { name: 'Jan', value: 3 },
            { name: 'Feb', value: 5 },
          ],
        },
        {
          name: 'Non-conformities',
          series: [{ name: 'Jan', value: 1 }],
        },
      ]);
    });

    it('maps an empty series list to an empty array', () => {
      expect(toNgxMultiSeries([])).toEqual([]);
    });

    it('maps a series with no points to an empty inner series', () => {
      const series: readonly ChartSeries[] = [{ name: 'Equipment', points: [] }];

      expect(toNgxMultiSeries(series)).toEqual([{ name: 'Equipment', series: [] }]);
    });
  });

  describe('toNgxSingleSeries', () => {
    it('maps one series points to name/value pairs', () => {
      const series: ChartSeries = {
        name: 'Facilities',
        points: [
          { label: 'Q1', value: 2 },
          { label: 'Q2', value: 4 },
        ],
      };

      const result: SingleSeries = toNgxSingleSeries(series);

      expect(result).toEqual([
        { name: 'Q1', value: 2 },
        { name: 'Q2', value: 4 },
      ]);
    });

    it('maps a series with no points to an empty array', () => {
      expect(toNgxSingleSeries({ name: 'Empty', points: [] })).toEqual([]);
    });

    it('preserves a Date label rather than coercing it to a string', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      const series: ChartSeries = { name: 'Dated', points: [{ label: date, value: 7 }] };

      expect(toNgxSingleSeries(series)).toEqual([{ name: date, value: 7 }]);
    });
  });
});
