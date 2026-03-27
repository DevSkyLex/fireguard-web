import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type {
  Chart,
  ChartData,
  ChartOptions,
  Plugin,
  ScriptableContext,
} from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import type {
  OrganizationEquipmentStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationMembershipStatisticsOutput,
  OrganizationNonConformityStatisticsOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';

/**
 * Constant operationsHoverLinkPlugin
 *
 * @description
 * Local Chart.js plugin drawing a vertical hover guideline across
 * the full plot area for the active index.
 */
const operationsHoverLinkPlugin: Plugin<'line'> = {
  id: 'operationsHoverLink',
  afterDatasetsDraw(chart: Chart<'line'>): void {
    const activeElements = chart.tooltip?.getActiveElements() ?? [];

    if (activeElements.length === 0) {
      return;
    }

    const x: number = activeElements[0].element.x;
    const { top, bottom } = chart.chartArea;
    const { ctx } = chart;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.28)';
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * Component OrganizationOverviewOperationsPulseChartComponent
 * @class OrganizationOverviewOperationsPulseChartComponent
 *
 * @description
 * Dedicated chart component for the overview operations pulse card.
 * It owns the Chart.js dataset, options, gradients, and hover plugin
 * so parent components only deal with business statistics.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-operations-pulse-chart',
  host: {
    class: 'block',
  },
  imports: [
    ChartModule,
    SkeletonModule,
  ],
  templateUrl: './organization-overview-operations-pulse-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewOperationsPulseChartComponent {
  //#region Inputs
  /**
   * Input overviewStatistics
   * @readonly
   *
   * @description
   * Overview statistics used by the operations chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationStatisticsOutput | null>}
   */
  public readonly overviewStatistics: InputSignal<OrganizationStatisticsOutput | null> =
    input<OrganizationStatisticsOutput | null>(null);

  /**
   * Input equipmentStatistics
   * @readonly
   *
   * @description
   * Equipment statistics used by the operations chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationEquipmentStatisticsOutput | null>}
   */
  public readonly equipmentStatistics: InputSignal<OrganizationEquipmentStatisticsOutput | null> =
    input<OrganizationEquipmentStatisticsOutput | null>(null);

  /**
   * Input inspectionStatistics
   * @readonly
   *
   * @description
   * Inspection statistics used by the operations chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationInspectionStatisticsOutput | null>}
   */
  public readonly inspectionStatistics: InputSignal<OrganizationInspectionStatisticsOutput | null> =
    input<OrganizationInspectionStatisticsOutput | null>(null);

  /**
   * Input membershipStatistics
   * @readonly
   *
   * @description
   * Membership statistics used by the operations chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationMembershipStatisticsOutput | null>}
   */
  public readonly membershipStatistics: InputSignal<OrganizationMembershipStatisticsOutput | null> =
    input<OrganizationMembershipStatisticsOutput | null>(null);

  /**
   * Input nonConformityStatistics
   * @readonly
   *
   * @description
   * Non-conformity statistics used by the operations chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationNonConformityStatisticsOutput | null>}
   */
  public readonly nonConformityStatistics: InputSignal<OrganizationNonConformityStatisticsOutput | null> =
    input<OrganizationNonConformityStatisticsOutput | null>(null);

  //#endregion

  //#region Properties
  /**
   * Property isReady
   * @readonly
   *
   * @description
   * Whether enough data is available to render the chart instead of
   * the loading skeleton.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isReady: Signal<boolean> = computed<boolean>(
    () => this.overviewStatistics() !== null,
  );

  /**
   * Property chartData
   * @readonly
   *
   * @description
   * Chart.js line dataset built from the card statistics.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartData<'line', number[], string>>}
   */
  protected readonly chartData: Signal<ChartData<'line', number[], string>> =
    computed<ChartData<'line', number[], string>>(() => {
      const overview = this.overviewStatistics();
      const equipment = this.equipmentStatistics();
      const inspections = this.inspectionStatistics();
      const membership = this.membershipStatistics();
      const nonConformities = this.nonConformityStatistics();

      return {
        labels: ['Facilities', 'Assets', 'Inspections', 'Members', 'Findings'],
        datasets: [
          {
            label: 'Volume',
            data: [
              overview?.facilityCount ?? 0,
              equipment?.totalCount ?? 0,
              inspections?.totalCount ?? 0,
              membership?.memberCount ?? 0,
              nonConformities?.totalCount ?? 0,
            ],
            borderColor: '#0ea5e9',
            backgroundColor: (context: ScriptableContext<'line'>): CanvasGradient | string => {
              const chartArea = context.chart.chartArea;

              if (!chartArea) {
                return 'rgba(14, 165, 233, 0.14)';
              }

              const gradient = context.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);

              gradient.addColorStop(0, 'rgba(14, 165, 233, 0.24)');
              gradient.addColorStop(0.55, 'rgba(14, 165, 233, 0.1)');
              gradient.addColorStop(1, 'rgba(14, 165, 233, 0.01)');

              return gradient;
            },
            pointBackgroundColor: 'rgba(255, 255, 255, 0.96)',
            pointBorderColor: '#0ea5e9',
            pointBorderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#0ea5e9',
            pointHoverBorderWidth: 3,
            fill: true,
            tension: 0.38,
            borderWidth: 2,
          },
          {
            label: 'Healthy / resolved',
            data: [
              overview?.activeFacilityCount ?? 0,
              equipment?.operationalCount ?? 0,
              inspections?.closedCount ?? 0,
              membership?.activeMemberCount ?? 0,
              (nonConformities?.doneCount ?? 0) + (nonConformities?.waivedCount ?? 0),
            ],
            borderColor: '#1d4ed8',
            backgroundColor: (context: ScriptableContext<'line'>): CanvasGradient | string => {
              const chartArea = context.chart.chartArea;

              if (!chartArea) {
                return 'rgba(29, 78, 216, 0.1)';
              }

              const gradient = context.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);

              gradient.addColorStop(0, 'rgba(29, 78, 216, 0.2)');
              gradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.08)');
              gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

              return gradient;
            },
            pointBackgroundColor: 'rgba(255, 255, 255, 0.96)',
            pointBorderColor: '#1d4ed8',
            pointBorderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#1d4ed8',
            pointHoverBorderWidth: 3,
            fill: true,
            tension: 0.38,
            borderWidth: 2,
          },
        ],
      };
    });

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * Static Chart.js configuration for the operations pulse chart.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChartOptions<'line'>}
   */
  protected readonly chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        cornerRadius: 14,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#64748b',
          font: {
            weight: 500,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grace: '10%',
        ticks: {
          precision: 0,
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
          drawTicks: false,
        },
      },
    },
  };

  /**
   * Property chartPlugins
   * @readonly
   *
   * @description
   * Mutable plugin array passed to PrimeNG's chart wrapper.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Plugin<'line'>[]>}
   */
  protected readonly chartPlugins: Signal<Plugin<'line'>[]> =
    computed<Plugin<'line'>[]>(() => [operationsHoverLinkPlugin]);
  //#endregion
}
