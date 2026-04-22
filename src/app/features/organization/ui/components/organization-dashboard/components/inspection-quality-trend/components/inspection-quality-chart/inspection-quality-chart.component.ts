import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { OrganizationDashboardInspectionQualityStore } from '@features/organization/state/organization-dashboard';
import {
  INSPECTION_RESULT_OPTIONS,
  INSPECTION_STATUS_OPTIONS,
  NON_CONFORMITY_SEVERITY_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';

/**
 * Function hexToRgb
 *
 * @description
 * Parses a six-digit hex colour string (with leading `#`) into its three RGB
 * integer channels. Used to build gradient fills and per-dataset colour variants.
 *
 * @param {string} hex - Six-digit hex colour string, e.g. `'#3b82f6'`.
 * @returns {[number, number, number]} Tuple of `[red, green, blue]` integer values.
 */
const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

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
  imports: [ChartModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionQualityChart {
  //#region Properties

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
   * Property data
   * @readonly
   *
   * @description
   * Fully computed mixed bar/line chart payload derived from store data
   * and active filter selections. Recalculates reactively on every change.
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

      const selectedResult = this.store.selectedInspectionResult();
      const selectedStatus = this.store.selectedInspectionStatus();
      const inspectionHex = selectedResult
        ? (INSPECTION_RESULT_OPTIONS.find((o) => o.value === selectedResult)?.color ?? '#3b82f6')
        : selectedStatus
          ? (INSPECTION_STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.color ?? '#3b82f6')
          : '#3b82f6';

      const selectedSeverity = this.store.selectedNonConformitySeverity();
      const ncHex = selectedSeverity
        ? (NON_CONFORMITY_SEVERITY_OPTIONS.find((o) => o.value === selectedSeverity)?.color ??
          '#f97316')
        : '#f97316';

      const [ir, ig, ib] = hexToRgb(inspectionHex);
      const [nr, ng, nb] = hexToRgb(ncHex);

      return {
        labels: [...aligned.labels],
        datasets: [
          {
            label: 'Inspections',
            data: inspectionData,
            backgroundColor: (context: ScriptableContext<'bar'>) => {
              const { ctx, chartArea } = context.chart;
              if (!chartArea) return `rgba(${ir}, ${ig}, ${ib}, 0.85)`;
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, `rgba(${ir}, ${ig}, ${ib}, 0.95)`);
              gradient.addColorStop(1, `rgba(${ir}, ${ig}, ${ib}, 0.65)`);
              return gradient;
            },
            hoverBackgroundColor: `rgba(${ir}, ${ig}, ${ib}, 1)`,
            borderRadius: 6,
            borderWidth: 0,
            yAxisID: 'y',
          },
          {
            label: 'NC Opened',
            data: ncOpenedData,
            backgroundColor: (context: ScriptableContext<'bar'>) => {
              const { ctx, chartArea } = context.chart;
              if (!chartArea) return `rgba(${nr}, ${ng}, ${nb}, 0.85)`;
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, `rgba(${nr}, ${ng}, ${nb}, 0.95)`);
              gradient.addColorStop(1, `rgba(${nr}, ${ng}, ${nb}, 0.65)`);
              return gradient;
            },
            hoverBackgroundColor: `rgba(${nr}, ${ng}, ${nb}, 1)`,
            borderRadius: 6,
            borderWidth: 0,
            yAxisID: 'y',
          },
          {
            type: 'line' as const,
            label: 'NC Rate (%)',
            data: rateData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: '#fff',
            pointHoverBackgroundColor: '#6366f1',
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
   * Static Chart.js configuration for axes, legend, tooltips and interaction.
   * Does not depend on store state; shared across all data refreshes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChartOptions<'bar'>}
   */
  protected readonly options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
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

  //#endregion
}
