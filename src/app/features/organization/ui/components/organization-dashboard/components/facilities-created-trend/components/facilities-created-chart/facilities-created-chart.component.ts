import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { OrganizationDashboardFacilitiesCreatedStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSingleTrendViewModel } from '@features/organization/ui/components/organization-dashboard/models';
import {
  buildDashboardSingleTrendBarChartData,
  buildDashboardSingleTrendViewModel,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Component FacilitiesCreatedChart
 * @class FacilitiesCreatedChart
 *
 * @description
 * Chart section for the facilities-created trend card.
 * Reads query data and compare state from
 * {@link OrganizationDashboardFacilitiesCreatedStore} to build a bar chart
 * payload internally. Renders a loading skeleton until data is available for
 * the first time; shows on every reload including filter changes.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facilities-created-chart',
  templateUrl: './facilities-created-chart.component.html',
  imports: [ChartModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilitiesCreatedChart {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store used to read query results and compare state
   * when computing chart datasets.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationDashboardFacilitiesCreatedStore}
   */
  private readonly store: OrganizationDashboardFacilitiesCreatedStore =
    inject<OrganizationDashboardFacilitiesCreatedStore>(OrganizationDashboardFacilitiesCreatedStore);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * `true` only during the initial load before any data has arrived.
   * Shown during every load, including filter-driven reloads.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly loading: Signal<boolean> = computed<boolean>(
    () => this.store.isQueryLoading(),
  );

  /**
   * Property trendViewModel
   * @readonly
   *
   * @description
   * Normalized view model derived from the raw API payload. Shared between
   * the {@link data} and {@link options} computeds to avoid redundant work.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Signal<DashboardSingleTrendViewModel>}
   */
  private readonly trendViewModel: Signal<DashboardSingleTrendViewModel> = computed(() =>
    buildDashboardSingleTrendViewModel(this.store.queryData(), this.store.compareEnabled()),
  );

  /**
   * Property data
   * @readonly
   *
   * @description
   * Fully computed bar chart payload derived from the trend view model.
   * Recalculates reactively on every store change.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartData<'bar'>>}
   */
  protected readonly data: Signal<ChartData<'bar'>> = computed<ChartData<'bar'>>(() =>
    buildDashboardSingleTrendBarChartData({
      viewModel: this.trendViewModel(),
      label: 'Facilities Created',
      currentBackgroundColor: '#14b8a6',
      currentHoverBackgroundColor: '#0d9488',
      comparisonBackgroundColor: '#99f6e4',
      comparisonHoverBackgroundColor: '#5eead4',
    }),
  );

  /**
   * Property options
   * @readonly
   *
   * @description
   * Chart.js configuration for axes, legend, tooltips and interaction.
   * Recomputes when compare mode toggles to update legend visibility.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartOptions<'bar'>>}
   */
  protected readonly options: Signal<ChartOptions<'bar'>> = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { mode: 'index', intersect: false },
    datasets: {
      bar: {
        barPercentage: 0.65,
        categoryPercentage: 0.8,
        borderRadius: 6,
        borderSkipped: 'start' as const,
        borderWidth: 0,
      },
    },
    plugins: {
      legend: {
        display: this.store.compareEnabled(),
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          title: (items) => items[0]?.label ?? '',
          label: (item) => ` ${item.dataset.label}: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      x: { border: { display: false }, grid: { display: false }, ticks: { display: false } },
      y: {
        border: { display: false },
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.04)', drawTicks: false },
        ticks: {
          precision: 0,
          maxTicksLimit: 5,
          color: '#94a3b8',
          font: { size: 11 },
          padding: 8,
        },
      },
    },
  }));

  //#endregion
}
