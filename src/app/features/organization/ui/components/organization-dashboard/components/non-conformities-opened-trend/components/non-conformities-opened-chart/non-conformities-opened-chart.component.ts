import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { OrganizationDashboardNonConformitiesOpenedStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSingleTrendViewModel } from '@features/organization/ui/components/organization-dashboard/models';
import {
  buildChartTooltipStyle,
  buildDashboardSingleTrendLineChartData,
  buildDashboardSingleTrendViewModel,
  resolveChartColor,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';

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
  imports: [ChartModule, SkeletonModule, ButtonModule, EmptyState, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformitiesOpenedChart {
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
   * @type {OrganizationDashboardNonConformitiesOpenedStore}
   */
  private readonly store: OrganizationDashboardNonConformitiesOpenedStore =
    inject<OrganizationDashboardNonConformitiesOpenedStore>(
      OrganizationDashboardNonConformitiesOpenedStore,
    );

  /**
   * Property themePort
   * @readonly
   *
   * @description
   * Neutral theme contract used to resolve the active appearance mode so the
   * chart tooltip can be styled to match the light or dark application theme.
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
   * Fully computed line chart payload derived from the trend view model.
   * Colour follows the same `danger` (red) tone the non-conformity status
   * registry already uses for `open`, resolved live through the chart palette
   * so it never drifts from the token vocabulary; the comparison series
   * derives from the shared builder's default (the same hue at reduced alpha).
   * Recalculates reactively on every store change and on every theme switch.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartData<'line'>>}
   */
  protected readonly data: Signal<ChartData<'line'>> = computed<ChartData<'line'>>(() => {
    const isDark = this.themePort.resolvedTheme() === 'dark';

    return buildDashboardSingleTrendLineChartData({
      viewModel: this.trendViewModel(),
      label: 'Non-Conformities Opened',
      currentColor: resolveChartColor('red-500'),
      pointHoverBorderColor: resolveChartColor(isDark ? 'surface-900' : 'surface-0'),
    });
  });

  /**
   * Property options
   * @readonly
   *
   * @description
   * Chart.js configuration for axes, legend, tooltips and interaction.
   * Recomputes when compare mode toggles to update legend visibility and when
   * the active theme changes so the tooltip and axis chrome stay theme-aware.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartOptions<'line'>>}
   */
  protected readonly options: Signal<ChartOptions<'line'>> = computed<ChartOptions<'line'>>(() => {
    const isDark = this.themePort.resolvedTheme() === 'dark';

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: this.reduceMotion ? 0 : 500 },
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
          ...buildChartTooltipStyle(isDark),
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
          grid: {
            color: resolveChartColor(isDark ? 'surface-800' : 'surface-200'),
            drawTicks: false,
          },
          ticks: {
            precision: 0,
            maxTicksLimit: 5,
            color: resolveChartColor(isDark ? 'surface-400' : 'surface-500'),
            font: { size: 11 },
            padding: 8,
          },
        },
      },
    };
  });

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
