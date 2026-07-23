import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { OrganizationDashboardEquipmentCreatedStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSingleTrendViewModel } from '@features/organization/ui/components/organization-dashboard/models';
import {
  buildDashboardSingleTrendBarChartData,
  buildDashboardSingleTrendViewModel,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { EmptyState, ErrorState } from '@shared/components';
import { buildChartTooltipStyle } from '@shared/utils';

/**
 * Component EquipmentCreatedChart
 * @class EquipmentCreatedChart
 *
 * @description
 * Chart section for the equipment-created trend card.
 * Reads query data and compare state from
 * {@link OrganizationDashboardEquipmentCreatedStore} to build a bar chart
 * payload internally. Renders a loading skeleton until data is available for
 * the first time; shows on every reload including filter changes.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-created-chart',
  templateUrl: './equipment-created-chart.component.html',
  imports: [ChartModule, SkeletonModule, ButtonModule, EmptyState, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCreatedChart {
  //#region Properties
  /**
   * Property reduceMotion
   * @readonly
   *
   * @description
   * Whether the visitor asked for reduced motion, read once at construction.
   *
   * Chart.js animates in JavaScript, so no CSS media query can reach it — the
   * preference has to be read here and folded into the chart options.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {boolean}
   */
  private readonly reduceMotion: boolean =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
   * @type {OrganizationDashboardEquipmentCreatedStore}
   */
  private readonly store: OrganizationDashboardEquipmentCreatedStore =
    inject<OrganizationDashboardEquipmentCreatedStore>(OrganizationDashboardEquipmentCreatedStore);

  /**
   * Property themePort
   * @readonly
   *
   * @description
   * Neutral theme contract used to resolve the concrete applied appearance
   * (`'light'` or `'dark'`) so the Chart.js tooltip can theme itself and
   * react to theme switches.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {ThemePort}
   */
  private readonly themePort: ThemePort = inject<ThemePort>(THEME_PORT);

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
   * Property hasError
   * @readonly
   *
   * @description
   * `true` when the underlying trend query failed, so the card can offer a
   * retry instead of rendering a blank canvas.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasError: Signal<boolean> = computed<boolean>(() =>
    this.store.queryHasError(),
  );

  /**
   * Property hasData
   * @readonly
   *
   * @description
   * `true` when the computed chart payload has at least one time bucket to
   * plot; `false` for an empty (zero-row) result so the card can show an
   * empty state instead of a blank chart.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasData: Signal<boolean> = computed<boolean>(
    () => (this.data().labels?.length ?? 0) > 0,
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
      label: 'Equipment Created',
      currentBackgroundColor: '#8b5cf6',
      currentHoverBackgroundColor: '#7c3aed',
      comparisonBackgroundColor: '#c4b5fd',
      comparisonHoverBackgroundColor: '#a78bfa',
    }),
  );

  /**
   * Property options
   * @readonly
   *
   * @description
   * Chart.js configuration for axes, legend, tooltips and interaction.
   * Theme-aware: recomputes when compare mode toggles to update legend
   * visibility and when the theme switches to restyle the tooltip.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartOptions<'bar'>>}
   */
  protected readonly options: Signal<ChartOptions<'bar'>> = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: this.reduceMotion ? 0 : 500 },
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
        ...buildChartTooltipStyle(this.themePort.resolvedTheme() === 'dark'),
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

  //#region Methods

  /**
   * Method retry
   *
   * @description
   * Re-runs the trend query with the current filter params after a load
   * failure, delegating to the store's reactive `load` method.
   *
   * @access protected
   * @since 2.2.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.store.load(this.store.loadParams());
  }

  //#endregion
}
