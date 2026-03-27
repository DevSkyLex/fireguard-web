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
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import type {
  OrganizationEquipmentStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationMembershipStatisticsOutput,
  OrganizationNonConformityStatisticsOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import { OrganizationOverviewOperationsPulseChartComponent } from '../organization-overview-operations-pulse-chart/organization-overview-operations-pulse-chart.component';
import type {
  OverviewPulseFilter,
  OverviewPulseReadout,
  OverviewToggleOption,
} from '../../organization-overview.types';

/**
 * Component OrganizationOverviewOperationsCardComponent
 * @class OrganizationOverviewOperationsCardComponent
 *
 * @description
 * Presentational analytics card showing the main operations pulse
 * chart and the supporting readout tiles.
 *
 * The card owns the chart component and the layout shell while the
 * parent page provides the underlying business statistics and the
 * supporting readout values.
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
    FormsModule,
    CardModule,
    SelectButtonModule,
    OrganizationOverviewOperationsPulseChartComponent,
  ],
  templateUrl: './organization-overview-operations-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewOperationsCardComponent {
  //#region Inputs
  /**
   * Input filterOptions
   * @readonly
   *
   * @description
   * Options rendered by the operations filter switcher.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OverviewToggleOption<OverviewPulseFilter>[]>}
   */
  public readonly filterOptions: InputSignal<readonly OverviewToggleOption<OverviewPulseFilter>[]> =
    input.required<readonly OverviewToggleOption<OverviewPulseFilter>[]>();

  /**
   * Input activeFilter
   * @readonly
   *
   * @description
   * Currently selected operations filter value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OverviewPulseFilter>}
   */
  public readonly activeFilter: InputSignal<OverviewPulseFilter> =
    input.required<OverviewPulseFilter>();

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

  /**
   * Input readouts
   * @readonly
   *
   * @description
   * Supporting summary values displayed below the chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OverviewPulseReadout[]>}
   */
  public readonly readouts: InputSignal<readonly OverviewPulseReadout[]> =
    input.required<readonly OverviewPulseReadout[]>();

  /**
   * Input hasData
   * @readonly
   *
   * @description
   * Whether the card should render the chart or the loading
   * skeleton placeholder.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasData: InputSignal<boolean> =
    input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output filterChange
   * @readonly
   *
   * @description
   * Emitted when the user switches the operations filter.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OverviewPulseFilter>}
   */
  public readonly filterChange: OutputEmitterRef<OverviewPulseFilter> =
    output<OverviewPulseFilter>();
  //#endregion

  //#region Properties
  /**
   * Property selectOptions
   * @readonly
   *
   * @description
   * Mutable clone of the filter options for PrimeNG's
   * `p-selectbutton` API.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OverviewToggleOption<OverviewPulseFilter>[]>}
   */
  protected readonly selectOptions: Signal<OverviewToggleOption<OverviewPulseFilter>[]> =
    computed<OverviewToggleOption<OverviewPulseFilter>[]>(() => [...this.filterOptions()]);
  //#endregion
}
