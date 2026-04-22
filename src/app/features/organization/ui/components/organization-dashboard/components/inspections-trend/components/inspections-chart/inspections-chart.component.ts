import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { OrganizationDashboardInspectionsTrendStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSingleTrendViewModel } from '@features/organization/ui/components/organization-dashboard/models';
import {
  INSPECTION_RESULT_OPTIONS,
  INSPECTION_STATUS_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import {
  buildDashboardSingleTrendLineChartData,
  buildDashboardSingleTrendViewModel,
} from '@features/organization/ui/components/organization-dashboard/utils';

/**
 * Component InspectionsChart
 * @class InspectionsChart
 *
 * @description
 * Chart section for the inspections trend card.
 * Reads query data, compare state and active filter selections from
 * {@link OrganizationDashboardInspectionsTrendStore} to build a line chart
 * payload internally. Renders a loading skeleton until data is available for
 * the first time; shows on every reload including filter changes.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspections-chart',
  templateUrl: './inspections-chart.component.html',
  imports: [ChartModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionsChart {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store used to read query results and active filter
   * selections when computing chart datasets and line colour.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationDashboardInspectionsTrendStore}
   */
  private readonly store: OrganizationDashboardInspectionsTrendStore =
    inject<OrganizationDashboardInspectionsTrendStore>(OrganizationDashboardInspectionsTrendStore);

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
  protected readonly loading: Signal<boolean> = computed<boolean>(() =>
    this.store.isQueryLoading(),
  );

  /**
   * Property trendViewModel
   * @readonly
   *
   * @description
   * Normalized view model derived from the raw API payload.
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
   * Fully computed line chart payload. The line colour is derived from the
   * active inspection result filter, then the active status filter, falling
   * back to the default blue when neither is set.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartData<'line'>>}
   */
  protected readonly data: Signal<ChartData<'line'>> = computed<ChartData<'line'>>(() => {
    const selectedResult = this.store.selectedInspectionResult();
    const selectedStatus = this.store.selectedInspectionStatus();
    const color = selectedResult
      ? (INSPECTION_RESULT_OPTIONS.find((o) => o.value === selectedResult)?.color ?? '#3b82f6')
      : selectedStatus
        ? (INSPECTION_STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.color ?? '#3b82f6')
        : '#3b82f6';

    return buildDashboardSingleTrendLineChartData({
      viewModel: this.trendViewModel(),
      label: 'Inspections',
      currentColor: color,
    });
  });

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
  protected readonly options: Signal<ChartOptions<'line'>> = computed<ChartOptions<'line'>>(() => ({
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
  }));

  //#endregion
}
