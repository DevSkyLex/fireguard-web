import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { OrganizationDashboardInspectionQualityStore } from '@features/organization/state/organization-dashboard';
import {
  INSPECTION_RESULT_OPTIONS,
  INSPECTION_STATUS_OPTIONS,
  NON_CONFORMITY_SEVERITY_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import {
  buildChartTooltipStyle,
  resolveChartColor,
  withChartAlpha,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';

/**
 * Component InspectionQualityChart
 * @class InspectionQualityChart
 *
 * @description
 * Chart section for the inspection-quality trend card.
 * Reads query data and active filter selections from
 * {@link OrganizationDashboardInspectionQualityStore} to build a mixed bar/line
 * payload internally. Renders a loading skeleton until data is available for the
 * first time; shows on every reload including filter changes.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-quality-chart',
  templateUrl: './inspection-quality-chart.component.html',
  imports: [ChartModule, SkeletonModule, ButtonModule, EmptyState, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionQualityChart {
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
   * Component-scoped store used to read query results and active filter
   * selections when computing chart datasets and axis colours.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationDashboardInspectionQualityStore}
   */
  private readonly store: OrganizationDashboardInspectionQualityStore =
    inject<OrganizationDashboardInspectionQualityStore>(
      OrganizationDashboardInspectionQualityStore,
    );

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
   * Fully computed mixed bar/line chart payload derived from store data and
   * active filter selections. The Inspections/NC Opened bars tint themselves
   * from whichever filter option registry supplied the active selection
   * (`INSPECTION_RESULT_OPTIONS`, `INSPECTION_STATUS_OPTIONS`,
   * `NON_CONFORMITY_SEVERITY_OPTIONS` — already on the four-tone vocabulary),
   * falling back to the `info` and `danger` status tones — matching the
   * `open` non-conformity status colour — when no filter narrows them. NC
   * Rate (%) is the one synthesized headline metric on this chart, so it
   * takes the app's theme-aware indigo accent, like Net Pressure on the
   * overview chart. Recalculates reactively on every store change and on
   * every theme switch.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartData<'bar' | 'line'>>}
   */
  protected readonly data: Signal<ChartData<'bar' | 'line'>> = computed<ChartData<'bar' | 'line'>>(
    () => {
      const aligned = this.store.alignedTrendData();
      const [inspectionData = [], ncOpenedData = []] = aligned.datasets;
      const rateData = [...this.store.rateSeriesData()];
      const isDark = this.themePort.resolvedTheme() === 'dark';

      const selectedResult = this.store.selectedInspectionResult();
      const selectedStatus = this.store.selectedInspectionStatus();
      const inspectionColor = selectedResult
        ? (INSPECTION_RESULT_OPTIONS.find((o) => o.value === selectedResult)?.color ??
          resolveChartColor('blue-500'))
        : selectedStatus
          ? (INSPECTION_STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.color ??
            resolveChartColor('blue-500'))
          : resolveChartColor('blue-500');

      const selectedSeverity = this.store.selectedNonConformitySeverity();
      const ncColor = selectedSeverity
        ? (NON_CONFORMITY_SEVERITY_OPTIONS.find((o) => o.value === selectedSeverity)?.color ??
          resolveChartColor('red-500'))
        : resolveChartColor('red-500');

      const rateColor = resolveChartColor('primary');
      const pointHoverBorderColor = resolveChartColor(isDark ? 'surface-900' : 'surface-0');

      return {
        labels: [...aligned.labels],
        datasets: [
          {
            label: 'Inspections',
            data: inspectionData,
            backgroundColor: (context: ScriptableContext<'bar'>) => {
              const { ctx, chartArea } = context.chart;
              if (!chartArea) return withChartAlpha(inspectionColor, 0.85);
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, withChartAlpha(inspectionColor, 0.95));
              gradient.addColorStop(1, withChartAlpha(inspectionColor, 0.65));
              return gradient;
            },
            hoverBackgroundColor: inspectionColor,
            borderRadius: 6,
            borderWidth: 0,
            yAxisID: 'y',
          },
          {
            label: 'NC Opened',
            data: ncOpenedData,
            backgroundColor: (context: ScriptableContext<'bar'>) => {
              const { ctx, chartArea } = context.chart;
              if (!chartArea) return withChartAlpha(ncColor, 0.85);
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, withChartAlpha(ncColor, 0.95));
              gradient.addColorStop(1, withChartAlpha(ncColor, 0.65));
              return gradient;
            },
            hoverBackgroundColor: ncColor,
            borderRadius: 6,
            borderWidth: 0,
            yAxisID: 'y',
          },
          {
            type: 'line' as const,
            label: 'NC Rate (%)',
            data: rateData,
            borderColor: rateColor,
            backgroundColor: withChartAlpha(rateColor, 0.08),
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor,
            pointHoverBackgroundColor: rateColor,
            fill: false,
            yAxisID: 'rateAxis',
          },
        ],
      };
    },
  );

  /**
   * Property options
   * @readonly
   *
   * @description
   * Theme-aware Chart.js configuration for axes, legend, tooltips and
   * interaction. Recomputes when the user switches theme so the canvas tooltip
   * stays styled to the app in both light and dark. Does not depend on store
   * state; shared across all data refreshes.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<ChartOptions<'bar'>>}
   */
  protected readonly options: Signal<ChartOptions<'bar'>> = computed<ChartOptions<'bar'>>(() => {
    const isDark = this.themePort.resolvedTheme() === 'dark';

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: this.reduceMotion ? 0 : 500 },
      interaction: { mode: 'index', intersect: false },
      datasets: {
        bar: {
          barPercentage: 0.72,
          categoryPercentage: 0.8,
        },
      },
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
        rateAxis: {
          type: 'linear',
          position: 'right',
          border: { display: false },
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { display: false },
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
