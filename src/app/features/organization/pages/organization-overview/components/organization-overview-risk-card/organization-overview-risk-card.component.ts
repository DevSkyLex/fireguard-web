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
 * The card owns the MeterGroup view model so the parent page only
 * needs to provide the underlying non-conformity statistics.
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

  //#endregion

  //#region Properties
  /**
   * Property chartMeterValues
   * @readonly
   *
   * @description
   * Severity segments derived from the statistics and passed to
   * PrimeNG MeterGroup.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OverviewMeterValue[]>}
   */
  protected readonly chartMeterValues: Signal<OverviewMeterValue[]> =
    computed<OverviewMeterValue[]>(() => {
      const stats: OrganizationNonConformityStatisticsOutput | null = this.statistics();

      return [
        {
          label: 'Critical',
          value: stats?.criticalSeverityCount ?? 0,
          color: '#ef4444',
        },
        {
          label: 'High',
          value: stats?.highSeverityCount ?? 0,
          color: '#f97316',
        },
        {
          label: 'Medium',
          value: stats?.mediumSeverityCount ?? 0,
          color: '#f59e0b',
        },
        {
          label: 'Low',
          value: stats?.lowSeverityCount ?? 0,
          color: '#22c55e',
        },
      ];
    });

  /**
   * Property meterMax
   * @readonly
   *
   * @description
   * Max value supplied to MeterGroup for relative rendering.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly meterMax: Signal<number> = computed<number>(() =>
    Math.max(this.statistics()?.totalCount ?? 0, 1),
  );

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
