import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { buildDifferenceSeries } from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import { OrganizationDashboardOverviewTrendStore } from '@features/organization/state/organization-dashboard';
import { buildChartTooltipStyle } from '@features/organization/ui/components/organization-dashboard/utils';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';

/**
 * Component OverviewChart
 * @class OverviewChart
 *
 * @description
 * Chart section for the overview trend card.
 * Reads aligned trend data from {@link OrganizationDashboardOverviewTrendStore}
 * to build a four-dataset line chart (Inspections, NC Opened, NC Resolved,
 * Net Pressure). The Net Pressure series is derived locally via
 * {@link buildDifferenceSeries}. Renders a loading skeleton until data is
 * available for the first time; shows on every reload including filter changes.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-overview-chart',
  templateUrl: './overview-chart.component.html',
  imports: [ChartModule, SkeletonModule, ButtonModule, EmptyState, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewChart {
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
   * Component-scoped store used to read aligned trend data when computing
   * chart datasets.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationDashboardOverviewTrendStore}
   */
  private readonly store: OrganizationDashboardOverviewTrendStore =
    inject<OrganizationDashboardOverviewTrendStore>(OrganizationDashboardOverviewTrendStore);

  /**
   * Property themePort
   * @readonly
   *
   * @description
   * Neutral theme contract, read to resolve the current light/dark appearance
   * so the canvas tooltip can be styled to match the app in both themes and
   * recompute when the user switches theme.
   *
   * @access private
   * @since 2.1.0
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
   * Property data
   * @readonly
   *
   * @description
   * Fully computed line chart payload. Derives the Net Pressure series
   * locally as the difference between NC Opened and NC Resolved.
   * Recalculates reactively on every store change.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartData<'line'>>}
   */
  protected readonly data: Signal<ChartData<'line'>> = computed<ChartData<'line'>>(() => {
    const aligned = this.store.alignedTrendData();
    const [inspectionData = [], openedData = [], resolvedData = []] = aligned.datasets;
    const netPressureData = buildDifferenceSeries(openedData, resolvedData);

    return {
      labels: [...aligned.labels],
      datasets: [
        {
          label: 'Inspections',
          data: inspectionData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#3b82f6',
          fill: false,
        },
        {
          label: 'NC Opened',
          data: openedData,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.08)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#f97316',
          fill: false,
        },
        {
          label: 'NC Resolved',
          data: resolvedData,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.08)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#22c55e',
          fill: false,
        },
        {
          label: 'Net Pressure',
          data: netPressureData,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          borderWidth: 2,
          borderDash: [5, 4],
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#6366f1',
          fill: false,
        },
      ],
    };
  });

  /**
   * Property options
   * @readonly
   *
   * @description
   * Theme-aware Chart.js configuration for the multi-series line chart.
   * Recomputes when the user switches theme so the canvas tooltip stays styled
   * to the app in both light and dark. The legend is always visible (four
   * permanent series).
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<ChartOptions<'line'>>}
   */
  protected readonly options: Signal<ChartOptions<'line'>> = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: this.reduceMotion ? 0 : 400 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
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
        beginAtZero: false,
        grid: { color: 'rgba(0, 0, 0, 0.04)', drawTicks: false },
        ticks: {
          precision: 0,
          maxTicksLimit: 5,
          color: '#a3a3a3',
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
