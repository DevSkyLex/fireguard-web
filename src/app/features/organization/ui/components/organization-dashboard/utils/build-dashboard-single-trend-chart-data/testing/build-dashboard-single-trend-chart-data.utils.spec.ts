import type { DashboardSingleTrendViewModel } from '@features/organization/ui/components/organization-dashboard/models';
import { buildDashboardSingleTrendLineChartData } from '../..';

describe('buildDashboardSingleTrendChartData utils', () => {
  const viewModel: DashboardSingleTrendViewModel = {
    labels: ['', '', ''],
    currentValues: [3, 5, 2],
    comparisonValues: [1, 4, 2],
    total: 10,
    previousTotal: 7,
    compareEnabled: true,
    hasComparisonData: true,
  };

  it('builds line chart data and derives a default comparison color', () => {
    const chartData = buildDashboardSingleTrendLineChartData({
      viewModel,
      label: 'Inspections',
      currentColor: '#3b82f6',
    });

    expect(chartData.labels).toEqual(['', '', '']);
    expect(chartData.datasets).toHaveLength(2);
    expect(chartData.datasets[0]).toMatchObject({
      label: 'Inspections',
      data: [3, 5, 2],
      borderColor: '#3b82f6',
      pointHoverBackgroundColor: '#3b82f6',
    });
    expect(chartData.datasets[1]).toMatchObject({
      label: 'Previous Period',
      data: [1, 4, 2],
      borderColor: 'rgba(59, 130, 246, 0.4)',
      pointHoverBackgroundColor: 'rgba(59, 130, 246, 0.4)',
    });
  });
});
