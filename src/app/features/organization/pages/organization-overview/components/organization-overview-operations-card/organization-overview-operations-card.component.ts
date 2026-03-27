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
import type { ChartData, ChartOptions } from 'chart.js';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import type {
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
 * All chart datasets and filters are provided by the parent page.
 * This component is responsible only for rendering and emitting
 * the selected filter value upward.
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
    ChartModule,
    SelectButtonModule,
    SkeletonModule,
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
   * @type {InputSignal<readonly OverviewToggleOption[]>}
   */
  public readonly filterOptions: InputSignal<readonly OverviewToggleOption[]> =
    input.required<readonly OverviewToggleOption[]>();

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
   * @type {InputSignal<string>}
   */
  public readonly activeFilter: InputSignal<string> =
    input.required<string>();

  /**
   * Input chartData
   * @readonly
   *
   * @description
   * Chart.js line dataset rendered by PrimeNG Chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ChartData<'line', number[], string>>}
   */
  public readonly chartData: InputSignal<ChartData<'line', number[], string>> =
    input.required<ChartData<'line', number[], string>>();

  /**
   * Input chartOptions
   * @readonly
   *
   * @description
   * Chart.js configuration for the line chart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ChartOptions<'line'>>}
   */
  public readonly chartOptions: InputSignal<ChartOptions<'line'>> =
    input.required<ChartOptions<'line'>>();

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
   * @type {OutputEmitterRef<string>}
   */
  public readonly filterChange: OutputEmitterRef<string> =
    output<string>();
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
   * @type {Signal<OverviewToggleOption[]>}
   */
  protected readonly selectOptions: Signal<OverviewToggleOption[]> =
    computed<OverviewToggleOption[]>(() => [...this.filterOptions()]);
  //#endregion
}
