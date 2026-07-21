import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { THEME_PORT, type ThemePort } from '@core/theme';
import {
  alignDashboardTrendSeries,
  type AlignedDashboardTrendSeries,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import {
  NonConformitiesTrendStore,
  type NonConformitiesTrendResource,
  type NonConformitiesTrendStoreType,
} from '@features/organization/state/organization-dashboard';
import { WHOLE_NUMBER_FMT } from '@features/organization/ui/components/organization-dashboard/utils';
import { EmptyState, ErrorState, TrendCard } from '@shared/components';
import { buildChartTooltipStyle } from '@shared/utils';

/**
 * Constant OPENED_COLOR
 * @const OPENED_COLOR
 *
 * @description
 * Series colour of the opened dataset — red, per the prototype.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
const OPENED_COLOR: string = '#ef4444';

/**
 * Constant RESOLVED_COLOR
 * @const RESOLVED_COLOR
 *
 * @description
 * Series colour of the resolved dataset — green, per the prototype.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
const RESOLVED_COLOR: string = '#22c55e';

/**
 * Component NonConformitiesTrend
 * @class NonConformitiesTrend
 *
 * @description
 * Merged non-conformities dashboard card: one dual-series area chart
 * plotting opened (red) vs resolved (green) non-conformities over the last
 * eight weeks, with per-series totals in the card's metric slot and the
 * Chart.js legend below the plot. Replaces the former separate opened and
 * resolved cards.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformities-trend',
  templateUrl: './non-conformities-trend.component.html',
  imports: [ChartModule, ButtonModule, SkeletonModule, TrendCard, EmptyState, ErrorState],
  providers: [NonConformitiesTrendStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformitiesTrend {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Card-scoped store owning the parallel opened/resolved trend query
   * over the fixed eight-week window.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonConformitiesTrendStoreType}
   */
  private readonly store: NonConformitiesTrendStoreType =
    inject<NonConformitiesTrendStoreType>(NonConformitiesTrendStore);

  /**
   * Property themePort
   * @readonly
   *
   * @description
   * Neutral theme contract so the canvas tooltip restyles itself when the
   * user switches appearance.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ThemePort}
   */
  private readonly themePort: ThemePort = inject<ThemePort>(THEME_PORT);

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Drives the card's metric skeletons and the chart placeholder while
   * the combined query is in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed<boolean>(() =>
    this.store.isQueryLoading(),
  );

  /**
   * Property hasError
   * @readonly
   *
   * @description
   * `true` when the combined trend query failed, so the card offers a
   * retry instead of a blank canvas.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasError: Signal<boolean> = computed<boolean>(() =>
    this.store.queryHasError(),
  );

  /**
   * Property aligned
   * @readonly
   *
   * @description
   * Opened and resolved series aligned on one shared weekly bucket axis,
   * zero-filled where either series has no events.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<AlignedDashboardTrendSeries>}
   */
  private readonly aligned: Signal<AlignedDashboardTrendSeries> = computed(
    (): AlignedDashboardTrendSeries => {
      const resource: NonConformitiesTrendResource | null = this.store.queryData();

      return alignDashboardTrendSeries(
        [resource?.opened?.series, resource?.resolved?.series],
        'week',
      );
    },
  );

  /**
   * Property hasData
   * @readonly
   *
   * @description
   * `true` when at least one weekly bucket exists to plot; `false` for an
   * empty window so the card shows an empty state instead of a blank chart.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasData: Signal<boolean> = computed<boolean>(
    () => this.aligned().buckets.length > 0,
  );

  /**
   * Property openedTotal
   * @readonly
   *
   * @description
   * Opened non-conformities summed across the plotted window, shown as the
   * card header's red legend chip.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly openedTotal: Signal<string> = computed<string>(() => {
    const [opened = []] = this.aligned().datasets;
    return WHOLE_NUMBER_FMT.format(
      opened.reduce((total: number, value: number): number => total + value, 0),
    );
  });

  /**
   * Property resolvedTotal
   * @readonly
   *
   * @description
   * Resolved non-conformities summed across the plotted window, shown as the
   * card header's green legend chip.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly resolvedTotal: Signal<string> = computed<string>(() => {
    const [, resolved = []] = this.aligned().datasets;
    return WHOLE_NUMBER_FMT.format(
      resolved.reduce((total: number, value: number): number => total + value, 0),
    );
  });

  /**
   * Property data
   * @readonly
   *
   * @description
   * Dual-series Chart.js line payload: opened in red, resolved in green,
   * both with a soft area fill down to the axis.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartData<'line'>>}
   */
  protected readonly data: Signal<ChartData<'line'>> = computed<ChartData<'line'>>(() => {
    const { labels, datasets } = this.aligned();
    const [opened = [], resolved = []] = datasets;
    const seriesStyle = {
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBorderWidth: 2,
      pointHoverBorderColor: '#fff',
      fill: 'origin',
    } as const;

    return {
      labels: [...labels],
      datasets: [
        {
          ...seriesStyle,
          label: $localize`:@@dash.ncTrend.opened:Opened`,
          data: [...opened],
          borderColor: OPENED_COLOR,
          backgroundColor: 'rgba(239, 68, 68, 0.10)',
          pointHoverBackgroundColor: OPENED_COLOR,
        },
        {
          ...seriesStyle,
          label: $localize`:@@dash.ncTrend.resolved:Resolved`,
          data: [...resolved],
          borderColor: RESOLVED_COLOR,
          backgroundColor: 'rgba(34, 197, 94, 0.10)',
          pointHoverBackgroundColor: RESOLVED_COLOR,
        },
      ],
    };
  });

  /**
   * Property options
   * @readonly
   *
   * @description
   * Chart.js configuration: always-on bottom legend for the two series and
   * a theme-aware tooltip that recomputes when the appearance changes.
   *
   * @access protected
   * @since 1.0.0
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
   * Re-runs the combined trend query after a load failure, delegating to
   * the store's reactive `load` method.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.store.load(this.store.loadParams());
  }

  //#endregion
}
