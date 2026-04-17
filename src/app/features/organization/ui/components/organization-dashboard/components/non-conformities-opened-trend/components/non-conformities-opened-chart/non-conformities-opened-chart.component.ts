import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { OrganizationDashboardNonConformitiesOpenedStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSingleTrendViewModel } from '@features/organization/ui/components/organization-dashboard/models';
import {
  buildDashboardSingleTrendLineChartData,
  buildDashboardSingleTrendViewModel,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * Component NonConformitiesOpenedChart
 * @class NonConformitiesOpenedChart
 *
 * @description
 * Chart section for the non-conformities-opened trend card.
 * Reads query data and compare state from
 * {@link OrganizationDashboardNonConformitiesOpenedStore} to build a line chart
 * payload internally. Renders a loading skeleton until data is available for
 * the first time; shows on every reload including filter changes.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformities-opened-chart',
  templateUrl: './non-conformities-opened-chart.component.html',
  imports: [ChartModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformitiesOpenedChart {
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
   * @type {OrganizationDashboardNonConformitiesOpenedStore}
   */
  private readonly store: OrganizationDashboardNonConformitiesOpenedStore =
    inject<OrganizationDashboardNonConformitiesOpenedStore>(
      OrganizationDashboardNonConformitiesOpenedStore,
    );

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
   * Fully computed line chart payload derived from the trend view model.
   * Recalculates reactively on every store change.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartData<'line'>>}
   */
  protected readonly data: Signal<ChartData<'line'>> = computed<ChartData<'line'>>(() =>
    buildDashboardSingleTrendLineChartData({
      viewModel: this.trendViewModel(),
      label: 'Non-Conformities Opened',
      currentColor: '#f97316',
      comparisonColor: '#fdba74',
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
   * @type {Signal<ChartOptions<'line'>>}
   */
  protected readonly options: Signal<ChartOptions<'line'>> = computed<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      interaction: { mode: 'index', intersect: false },
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
    }),
  );

  //#endregion
}
