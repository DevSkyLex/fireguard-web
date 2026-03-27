import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import type { OrganizationMembershipStatisticsOutput } from '@core/models/organization';

interface TeamSummaryItem {
  readonly label: string;
  readonly value: number;
}

/**
 * Component OrganizationOverviewTeamCardComponent
 * @class OrganizationOverviewTeamCardComponent
 *
 * @description
 * Presentational membership analytics card for the organization
 * overview page. Renders the team chart and a small summary grid
 * from statistics already prepared by the parent container.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-team-card',
  host: {
    style: 'display: block',
  },
  imports: [
    ButtonModule,
    CardModule,
    ChartModule,
    SkeletonModule,
  ],
  templateUrl: './organization-overview-team-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewTeamCardComponent {
  //#region Inputs
  /**
   * Input statistics
   * @readonly
   *
   * @description
   * Membership statistics used to populate the chart and summary.
   * A null value renders the loading skeleton state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationMembershipStatisticsOutput | null>}
   */
  public readonly statistics: InputSignal<OrganizationMembershipStatisticsOutput | null> =
    input<OrganizationMembershipStatisticsOutput | null>(null);

  /**
   * Input chartData
   * @readonly
   *
   * @description
   * Chart.js dataset rendered by PrimeNG's bar chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ChartData<'bar', number[], string>>}
   */
  public readonly chartData: InputSignal<ChartData<'bar', number[], string>> =
    input.required<ChartData<'bar', number[], string>>();

  /**
   * Input chartOptions
   * @readonly
   *
   * @description
   * Chart.js configuration for the membership chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ChartOptions<'bar'>>}
   */
  public readonly chartOptions: InputSignal<ChartOptions<'bar'>> =
    input.required<ChartOptions<'bar'>>();
  //#endregion

  //#region Outputs
  /**
   * Output viewReport
   * @readonly
   *
   * @description
   * Emitted when the secondary report button is clicked.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly viewReport: OutputEmitterRef<void> =
    output<void>();
  //#endregion

  //#region Properties
  /**
   * Property summaryItems
   * @readonly
   *
   * @description
   * Derived summary tiles rendered below the chart.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly TeamSummaryItem[]>}
   */
  protected readonly summaryItems: Signal<readonly TeamSummaryItem[]> = computed<readonly TeamSummaryItem[]>(() => {
    const stats: OrganizationMembershipStatisticsOutput | null = this.statistics();

    return [
      {
        label: 'Members',
        value: stats?.memberCount ?? 0,
      },
      {
        label: 'Roles',
        value: stats?.roleCount ?? 0,
      },
      {
        label: 'Pending',
        value: stats?.pendingInvitationCount ?? 0,
      },
      {
        label: 'Custom roles',
        value: stats?.customRoleCount ?? 0,
      },
    ] as const;
  });
  //#endregion
}
