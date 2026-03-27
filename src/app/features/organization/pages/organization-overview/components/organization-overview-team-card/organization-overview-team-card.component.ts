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
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import type { OrganizationMembershipStatisticsOutput } from '@core/models/organization';
import { OrganizationOverviewTeamOverviewChartComponent } from '../organization-overview-team-overview-chart/organization-overview-team-overview-chart.component';

/**
 * Interface TeamSummaryItem
 *
 * @description
 * Compact membership summary tile rendered below the chart.
 */
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
 * overview page. It owns the chart component and renders a small
 * summary grid from statistics prepared by the parent container.
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
    OrganizationOverviewTeamOverviewChartComponent,
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
