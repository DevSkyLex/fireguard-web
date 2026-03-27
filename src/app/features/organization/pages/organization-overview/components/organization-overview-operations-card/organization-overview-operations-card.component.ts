import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import type {
  OrganizationEquipmentStatisticsOutput,
  OrganizationFacilityStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationMembershipStatisticsOutput,
  OrganizationNonConformityStatisticsOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import { OrganizationOverviewOperationsPulseChartComponent } from '../organization-overview-operations-pulse-chart/organization-overview-operations-pulse-chart.component';

/**
 * Interface OrganizationOverviewOperationsReadout
 *
 * @description
 * Local readout item displayed below the operations pulse chart.
 */
interface OrganizationOverviewOperationsReadout {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
}

/**
 * Component OrganizationOverviewOperationsCardComponent
 * @class OrganizationOverviewOperationsCardComponent
 *
 * @description
 * Smart analytics card showing the main operations pulse chart
 * and the supporting readout tiles.
 *
 * The card owns the chart component and the layout shell. The parent
 * page only provides the underlying business statistics.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-operations-card',
  host: {
    style: 'display: block',
  },
  imports: [
    CardModule,
    OrganizationOverviewOperationsPulseChartComponent,
  ],
  templateUrl: './organization-overview-operations-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewOperationsCardComponent {
  //#region Inputs
  /**
   * Input overviewStatistics
   * @readonly
   *
   * @description
   * Overview statistics forwarded to the operations chart.
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
   * Equipment statistics forwarded to the operations chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationEquipmentStatisticsOutput | null>}
   */
  public readonly equipmentStatistics: InputSignal<OrganizationEquipmentStatisticsOutput | null> =
    input<OrganizationEquipmentStatisticsOutput | null>(null);

  /**
   * Input facilityStatistics
   * @readonly
   *
   * @description
   * Facility statistics used to derive facility readouts.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationFacilityStatisticsOutput | null>}
   */
  public readonly facilityStatistics: InputSignal<OrganizationFacilityStatisticsOutput | null> =
    input<OrganizationFacilityStatisticsOutput | null>(null);

  /**
   * Input inspectionStatistics
   * @readonly
   *
   * @description
   * Inspection statistics forwarded to the operations chart.
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
   * Membership statistics forwarded to the operations chart.
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
   * Non-conformity statistics forwarded to the operations chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationNonConformityStatisticsOutput | null>}
   */
  public readonly nonConformityStatistics: InputSignal<OrganizationNonConformityStatisticsOutput | null> =
    input<OrganizationNonConformityStatisticsOutput | null>(null);
  //#endregion

  //#region ViewModel
  /**
   * Property readouts
   * @readonly
   *
   * @description
   * Summary readouts rendered below the pulse chart.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationOverviewOperationsReadout[]>}
   */
  protected readonly readouts: Signal<readonly OrganizationOverviewOperationsReadout[]> =
    computed<readonly OrganizationOverviewOperationsReadout[]>(() => {
      const overview: OrganizationStatisticsOutput | null = this.overviewStatistics();
      const equipment: OrganizationEquipmentStatisticsOutput | null =
        this.equipmentStatistics();
      const facilities: OrganizationFacilityStatisticsOutput | null =
        this.facilityStatistics();
      const inspections: OrganizationInspectionStatisticsOutput | null =
        this.inspectionStatistics();
      const membership: OrganizationMembershipStatisticsOutput | null =
        this.membershipStatistics();
      const nonConformities: OrganizationNonConformityStatisticsOutput | null =
        this.nonConformityStatistics();

      const resolvedFindings: number =
        (nonConformities?.doneCount ?? 0) + (nonConformities?.waivedCount ?? 0);
      const openFindings: number =
        (nonConformities?.openCount ?? 0) +
        (nonConformities?.inProgressCount ?? 0);

      return [
        {
          label: 'Facilities',
          value: `${overview?.activeFacilityCount ?? 0}/${overview?.facilityCount ?? 0}`,
          helper: `${Object.keys(facilities?.countsByType ?? {}).length} tracked types`,
        },
        {
          label: 'Assets',
          value: `${equipment?.operationalCount ?? 0}/${equipment?.totalCount ?? 0}`,
          helper: `${equipment?.underMaintenanceCount ?? 0} in maintenance`,
        },
        {
          label: 'Inspections',
          value: `${inspections?.closedCount ?? 0}/${inspections?.totalCount ?? 0}`,
          helper: `${inspections?.passCount ?? 0} passed`,
        },
        {
          label: 'Members',
          value: `${membership?.activeMemberCount ?? 0}/${membership?.memberCount ?? 0}`,
          helper: `${membership?.roleCount ?? 0} active roles`,
        },
        {
          label: 'Findings',
          value: `${resolvedFindings}/${nonConformities?.totalCount ?? 0}`,
          helper: `${openFindings} still open`,
        },
      ] as const;
    });
  //#endregion
}
