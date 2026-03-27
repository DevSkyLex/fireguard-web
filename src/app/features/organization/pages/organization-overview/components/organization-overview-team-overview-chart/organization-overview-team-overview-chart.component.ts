import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type {
  ChartData,
  ChartOptions,
  ScriptableContext,
} from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import type { OrganizationMembershipStatisticsOutput } from '@core/models/organization';

type GradientStop = readonly [offset: number, color: string];

function createVerticalGradient(
  context: ScriptableContext<'bar'>,
  stops: readonly GradientStop[],
  fallback: string,
): CanvasGradient | string {
  const chartArea = context.chart.chartArea;

  if (!chartArea) {
    return fallback;
  }

  const gradient: CanvasGradient = context.chart.ctx.createLinearGradient(
    0,
    chartArea.top,
    0,
    chartArea.bottom,
  );

  for (const [offset, color] of stops) {
    gradient.addColorStop(offset, color);
  }

  return gradient;
}

/**
 * Component OrganizationOverviewTeamOverviewChartComponent
 * @class OrganizationOverviewTeamOverviewChartComponent
 *
 * @description
 * Dedicated chart component for the membership and invitations card.
 * It owns the bar dataset and Chart.js configuration so the parent
 * card remains focused on layout and summary values.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-team-overview-chart',
  host: {
    class: 'block',
  },
  imports: [
    ChartModule,
    SkeletonModule,
  ],
  templateUrl: './organization-overview-team-overview-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewTeamOverviewChartComponent {
  //#region Inputs
  /**
   * Input statistics
   * @readonly
   *
   * @description
   * Membership statistics used to build the bar chart.
   * A null value renders the loading skeleton state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationMembershipStatisticsOutput | null>}
   */
  public readonly statistics: InputSignal<OrganizationMembershipStatisticsOutput | null> =
    input<OrganizationMembershipStatisticsOutput | null>(null);
  //#endregion

  //#region Properties
  /**
   * Property chartData
   * @readonly
   *
   * @description
   * Chart.js dataset built from membership statistics.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartData<'bar', number[], string>>}
   */
  protected readonly chartData: Signal<ChartData<'bar', number[], string>> =
    computed<ChartData<'bar', number[], string>>(() => {
      const statistics = this.statistics();

      return {
        labels: ['Active', 'Inactive', 'Roles', 'Accepted', 'Pending', 'Expired'],
        datasets: [
          {
            label: 'Organization activity',
            data: [
              statistics?.activeMemberCount ?? 0,
              statistics?.inactiveMemberCount ?? 0,
              statistics?.roleCount ?? 0,
              statistics?.acceptedInvitationCount ?? 0,
              statistics?.pendingInvitationCount ?? 0,
              statistics?.expiredInvitationCount ?? 0,
            ],
            backgroundColor: (context: ScriptableContext<'bar'>) =>
              createVerticalGradient(
                context,
                [
                  [0, 'rgba(14, 165, 233, 0.95)'],
                  [0.45, 'rgba(59, 130, 246, 0.78)'],
                  [1, 'rgba(191, 219, 254, 0.42)'],
                ],
                'rgba(59, 130, 246, 0.78)',
              ),
            hoverBackgroundColor: (context: ScriptableContext<'bar'>) =>
              createVerticalGradient(
                context,
                [
                  [0, 'rgba(2, 132, 199, 1)'],
                  [0.5, 'rgba(37, 99, 235, 0.88)'],
                  [1, 'rgba(147, 197, 253, 0.5)'],
                ],
                'rgba(2, 132, 199, 0.88)',
              ),
            borderColor: 'rgba(255, 255, 255, 0.42)',
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 28,
          },
        ],
      };
    });

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * Static Chart.js configuration for the team overview chart.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChartOptions<'bar'>}
   */
  protected readonly chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
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
          color: 'rgba(148, 163, 184, 0.16)',
          drawTicks: false,
        },
      },
    },
  };
  //#endregion
}
