import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import { MeterGroupModule } from 'primeng/metergroup';
import { SkeletonModule } from 'primeng/skeleton';
import type {
  OrganizationNonConformityStatisticsOutput,
} from '@core/models/organization';
import type { OverviewMeterValue } from '../../organization-overview.types';

interface RiskSummaryItem {
  readonly label: string;
  readonly value: number;
}

/**
 * Component OrganizationOverviewRiskCardComponent
 * @class OrganizationOverviewRiskCardComponent
 *
 * @description
 * Presentational risk card showing non-conformity severity via
 * PrimeNG MeterGroup and a compact summary grid.
 *
 * The parent page remains responsible for fetching statistics and
 * preparing the meter values.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-risk-card',
  host: {
    style: 'display: block',
  },
  imports: [
    CardModule,
    MeterGroupModule,
    SkeletonModule,
  ],
  templateUrl: './organization-overview-risk-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewRiskCardComponent {
  //#region Inputs
  /**
   * Input statistics
   * @readonly
   *
   * @description
   * Non-conformity statistics displayed by the card.
   * A null value shows the skeleton placeholder.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationNonConformityStatisticsOutput | null>}
   */
  public readonly statistics: InputSignal<OrganizationNonConformityStatisticsOutput | null> =
    input<OrganizationNonConformityStatisticsOutput | null>(null);

  /**
   * Input meterValues
   * @readonly
   *
   * @description
   * Severity segments rendered by PrimeNG MeterGroup.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OverviewMeterValue[]>}
   */
  public readonly meterValues: InputSignal<readonly OverviewMeterValue[]> =
    input.required<readonly OverviewMeterValue[]>();

  /**
   * Input meterMax
   * @readonly
   *
   * @description
   * Max value supplied to MeterGroup for relative rendering.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly meterMax: InputSignal<number> =
    input.required<number>();
  //#endregion

  //#region Properties
  /**
   * Property chartMeterValues
   * @readonly
   *
   * @description
   * Mutable clone of meter segments required by PrimeNG's
   * `p-metergroup` input contract.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OverviewMeterValue[]>}
   */
  protected readonly chartMeterValues: Signal<OverviewMeterValue[]> =
    computed<OverviewMeterValue[]>(() => [...this.meterValues()]);

  /**
   * Property summaryItems
   * @readonly
   *
   * @description
   * Derived stat tiles displayed under the severity meter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly RiskSummaryItem[]>}
   */
  protected readonly summaryItems: Signal<readonly RiskSummaryItem[]> = computed<readonly RiskSummaryItem[]>(() => {
    const stats: OrganizationNonConformityStatisticsOutput | null = this.statistics();

    return [
      {
        label: 'Open',
        value: stats?.openCount ?? 0,
      },
      {
        label: 'In progress',
        value: stats?.inProgressCount ?? 0,
      },
      {
        label: 'Done',
        value: stats?.doneCount ?? 0,
      },
      {
        label: 'Waived',
        value: stats?.waivedCount ?? 0,
      },
    ] as const;
  });
  //#endregion
}
