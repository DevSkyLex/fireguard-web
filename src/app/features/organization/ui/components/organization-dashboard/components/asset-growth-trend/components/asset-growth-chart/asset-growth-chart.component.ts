import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { getDashboardTrendPointValue } from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import { EmptyState, ErrorState } from '@shared/components';
import { buildChartTooltipStyle } from '@shared/utils';

/**
 * Component AssetGrowthChart
 * @class AssetGrowthChart
 *
 * @description
 * Chart section for the asset-growth trend card.
 * Reads aligned trend data from {@link OrganizationDashboardAssetGrowthStore}
 * to build a grouped bar chart showing equipment and facilities created
 * side-by-side. Renders a loading skeleton until data is available for
 * the first time; shows on every reload including filter changes.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-asset-growth-chart',
  templateUrl: './asset-growth-chart.component.html',
  imports: [ChartModule, SkeletonModule, ButtonModule, EmptyState, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetGrowthChart {
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
   * Component-scoped store used to read aligned trend data and compare state
   * when computing chart datasets.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationDashboardAssetGrowthStore}
   */
  private readonly store: OrganizationDashboardAssetGrowthStore =
    inject<OrganizationDashboardAssetGrowthStore>(OrganizationDashboardAssetGrowthStore);

  /**
   * Property themePort
   * @readonly
   *
   * @description
   * Neutral theme contract used to resolve the concrete applied appearance
   * (`'light'` or `'dark'`) so the canvas tooltip can theme itself and
   * recompute when the user switches theme.
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
   * Property data
   * @readonly
   *
   * @description
   * Fully computed bar chart payload derived from the aligned trend data.
   * Recalculates reactively on every store change.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartData<'bar'>>}
   */
  protected readonly data: Signal<ChartData<'bar'>> = computed<ChartData<'bar'>>(() => {
    const growth = this.store.queryData();
    const compareEnabled = this.store.compareEnabled();
    const canReadEquipment = this.store.canReadEquipment();
    const canReadFacilities = this.store.canReadFacilities();
    const aligned = this.store.alignedTrendData();
    const [equipmentData = [], facilityData = []] = aligned.datasets;

    const datasets: ChartData<'bar'>['datasets'] = [];

    if (canReadEquipment) {
      datasets.push({
        label: 'Equipment Created',
        data: equipmentData,
        backgroundColor: '#8b5cf6',
        hoverBackgroundColor: '#7c3aed',
      });
    }

    if (canReadFacilities) {
      datasets.push({
        label: 'Facilities Created',
        data: facilityData,
        backgroundColor: '#14b8a6',
        hoverBackgroundColor: '#0d9488',
      });
    }

    const equipmentComparisonData = (growth?.equipment?.comparison?.series ?? []).map((p) =>
      getDashboardTrendPointValue(p),
    );
    const facilityComparisonData = (growth?.facilities?.comparison?.series ?? []).map((p) =>
      getDashboardTrendPointValue(p),
    );

    if (canReadEquipment && compareEnabled && equipmentComparisonData.length > 0) {
      datasets.push({
        label: 'Equipment Previous Period',
        data: equipmentComparisonData,
        backgroundColor: '#c4b5fd',
        hoverBackgroundColor: '#a78bfa',
      });
    }

    if (canReadFacilities && compareEnabled && facilityComparisonData.length > 0) {
      datasets.push({
        label: 'Facilities Previous Period',
        data: facilityComparisonData,
        backgroundColor: '#99f6e4',
        hoverBackgroundColor: '#5eead4',
      });
    }

    return { labels: [...aligned.labels], datasets };
  });

  /**
   * Property options
   * @readonly
   *
   * @description
   * Theme-aware Chart.js configuration for the grouped bar chart.
   * The legend is always visible (no compare toggle dependency). The tooltip
   * presentation is app-styled and recomputes on every theme switch.
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
        barPercentage: 0.72,
        categoryPercentage: 0.8,
        borderRadius: 6,
        borderWidth: 0,
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
