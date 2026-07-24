import type { OrganizationDashboardTrendSeriesPoint } from '@features/organization/models';
import {
  alignDashboardTrendSeries,
  buildDifferenceSeries,
  buildPercentageSeries,
  formatDashboardTrendBucket,
  getDashboardTrendPointBucket,
  getDashboardTrendSeriesValues,
  sumDashboardTrendValues,
  sumTrendSeries,
} from '../organization-dashboard-trend.adapter';

describe('organization dashboard trend utils', () => {
  it('formats iso week buckets into readable labels', () => {
    expect(formatDashboardTrendBucket('2026-W14', 'week')).toBe('Mar 30 - Apr 05, 2026');
  });

  it('formats month buckets into readable labels', () => {
    expect(formatDashboardTrendBucket('2026-04', 'month')).toBe('Apr 2026');
  });

  it('formats day buckets into a week-range label under week granularity', () => {
    expect(formatDashboardTrendBucket('2026-04-15', 'week')).toBe('Apr 15 - Apr 21, 2026');
  });

  it('formats day buckets into a single-day label under day granularity', () => {
    expect(formatDashboardTrendBucket('2026-04-15', 'day')).toBe('Apr 15, 2026');
  });

  it('formats an unrecognised bucket string via Date parsing', () => {
    expect(formatDashboardTrendBucket('2026-04-15T00:00:00Z', 'day')).toBe('Apr 15, 2026');
  });

  it('returns an empty string for an empty bucket', () => {
    expect(formatDashboardTrendBucket('', 'day')).toBe('');
  });

  it('returns the raw string when it cannot be parsed as a date', () => {
    expect(formatDashboardTrendBucket('not-a-date', 'day')).toBe('not-a-date');
  });

  it('extracts the bucket key from date and from fields', () => {
    expect(getDashboardTrendPointBucket({ date: '2026-03' })).toBe('2026-03');
    expect(getDashboardTrendPointBucket({ from: '2026-04' })).toBe('2026-04');
    expect(getDashboardTrendPointBucket({})).toBe('');
  });

  it('sums a plain numeric series', () => {
    expect(sumDashboardTrendValues([1, 2, 3])).toBe(6);
  });

  it('aligns sparse trend series onto shared buckets', () => {
    const inspections: readonly OrganizationDashboardTrendSeriesPoint[] = [
      { bucket: '2026-03', value: 4 },
      { bucket: '2026-04', value: 8 },
    ];
    const nonConformities: readonly OrganizationDashboardTrendSeriesPoint[] = [
      { bucket: '2026-04', value: 2 },
      { bucket: '2026-05', value: 5 },
    ];

    expect(alignDashboardTrendSeries([inspections, nonConformities], 'month')).toEqual({
      buckets: ['2026-03', '2026-04', '2026-05'],
      labels: ['Mar 2026', 'Apr 2026', 'May 2026'],
      datasets: [
        [4, 8, 0],
        [0, 2, 5],
      ],
    });
  });

  it('builds difference series bucket by bucket', () => {
    expect(buildDifferenceSeries([6, 2, 5], [3, 5, 1])).toEqual([3, -3, 4]);
  });

  it('builds percentage series and guards zero denominators', () => {
    expect(buildPercentageSeries([2, 3, 1], [4, 0, 2])).toEqual([50, 0, 50]);
  });

  it('extracts numeric values from a raw trend series', () => {
    const series: readonly OrganizationDashboardTrendSeriesPoint[] = [
      { bucket: '2026-03', count: 4 },
      { bucket: '2026-04', total: 8 },
      { bucket: '2026-05', value: 2 },
    ];

    expect(getDashboardTrendSeriesValues(series)).toEqual([4, 8, 2]);
  });

  it('sums a raw trend series without manual mapping', () => {
    const series: readonly OrganizationDashboardTrendSeriesPoint[] = [
      { bucket: '2026-03', count: 4 },
      { bucket: '2026-04', total: 8 },
      { bucket: '2026-05', value: 2 },
    ];

    expect(sumTrendSeries(series)).toBe(14);
  });
});
