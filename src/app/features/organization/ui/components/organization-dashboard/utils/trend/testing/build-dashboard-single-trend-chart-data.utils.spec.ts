import type { DashboardSingleTrendViewModel } from '@features/organization/ui/components/organization-dashboard/models';
import {
  buildDashboardSingleTrendBarChartData,
  buildDashboardSingleTrendLineChartData,
} from '..';

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

  it('builds bar chart data with comparison dataset', () => {
    const chartData = buildDashboardSingleTrendBarChartData({
      viewModel,
      label: 'Equipment Created',
      currentBackgroundColor: '#8b5cf6',
      currentHoverBackgroundColor: '#7c3aed',
      comparisonBackgroundColor: '#c4b5fd',
      comparisonHoverBackgroundColor: '#a78bfa',
    });

    expect(chartData.labels).toEqual(['', '', '']);
    expect(chartData.datasets).toHaveLength(2);
    expect(chartData.datasets[0]).toMatchObject({
      label: 'Equipment Created',
      data: [3, 5, 2],
      backgroundColor: '#8b5cf6',
      hoverBackgroundColor: '#7c3aed',
    });
    expect(chartData.datasets[1]).toMatchObject({
      label: 'Previous Period',
      data: [1, 4, 2],
      backgroundColor: '#c4b5fd',
      hoverBackgroundColor: '#a78bfa',
    });
  });

  it('omits the comparison dataset when no comparison should be rendered', () => {
    const chartData = buildDashboardSingleTrendBarChartData({
      viewModel: {
        ...viewModel,
        compareEnabled: false,
      },
      label: 'Facilities Created',
      currentBackgroundColor: '#14b8a6',
      comparisonBackgroundColor: '#99f6e4',
    });

    expect(chartData.datasets).toHaveLength(1);
  });

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