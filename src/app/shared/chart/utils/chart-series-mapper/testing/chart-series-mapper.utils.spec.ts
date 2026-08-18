import type { ChartData } from 'chart.js';
import type { ChartSeries } from '@shared/chart';
import { toChartJsLineData } from '../chart-series-mapper.utils';

const PALETTE: readonly string[] = ['oklch(0.58 0.10 230)', 'oklch(0.60 0.11 170)'];

describe('chart-series-mapper utils', () => {
  describe('toChartJsLineData', () => {
    it('maps each series to a labelled dataset over the shared label axis', () => {
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
          points: [
            { label: 'Jan', value: 1 },
            { label: 'Feb', value: 2 },
          ],
        },
      ];

      const result: ChartData<'line'> = toChartJsLineData(series, PALETTE, false, false);

      expect(result.labels).toEqual(['Jan', 'Feb']);
      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0]?.label).toBe('Inspections');
      expect(result.datasets[0]?.data).toEqual([3, 5]);
      expect(result.datasets[0]?.borderColor).toBe(PALETTE[0]);
      expect(result.datasets[1]?.borderColor).toBe(PALETTE[1]);
    });

    it('maps an empty series list to an empty label axis and no datasets', () => {
      const result: ChartData<'line'> = toChartJsLineData([], PALETTE, false, false);

      expect(result.labels).toEqual([]);
      expect(result.datasets).toEqual([]);
    });

    it('formats a Date label to a plain string', () => {
      const series: readonly ChartSeries[] = [
        {
          name: 'Dated',
          points: [{ label: new Date('2026-01-15T00:00:00Z'), value: 7 }],
        },
      ];

      const result: ChartData<'line'> = toChartJsLineData(series, PALETTE, false, false);

      expect(typeof result.labels?.[0]).toBe('string');
    });

    it('renders a flat translucent fill when area is set without gradient', () => {
      const series: readonly ChartSeries[] = [
        { name: 'Equipment', points: [{ label: 'Jan', value: 2 }] },
      ];

      const result: ChartData<'line'> = toChartJsLineData(series, PALETTE, true, false);

      expect(result.datasets[0]?.fill).toBe(true);
      expect(typeof result.datasets[0]?.backgroundColor).toBe('string');
      expect(result.datasets[0]?.backgroundColor).toContain('/ 0.18');
    });

    it('renders a scriptable gradient fill when area and gradient are both set', () => {
      const series: readonly ChartSeries[] = [
        { name: 'Equipment', points: [{ label: 'Jan', value: 2 }] },
      ];

      const result: ChartData<'line'> = toChartJsLineData(series, PALETTE, true, true);

      expect(result.datasets[0]?.fill).toBe(true);
      expect(typeof result.datasets[0]?.backgroundColor).toBe('function');
    });

    it('renders a flat, opaque colour with no fill when area is off', () => {
      const series: readonly ChartSeries[] = [
        { name: 'Equipment', points: [{ label: 'Jan', value: 2 }] },
      ];

      const result: ChartData<'line'> = toChartJsLineData(series, PALETTE, false, true);

      expect(result.datasets[0]?.fill).toBe(false);
      expect(result.datasets[0]?.backgroundColor).toBe(PALETTE[0]);
    });
  });
});
