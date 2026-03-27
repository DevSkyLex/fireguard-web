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
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import type { OrganizationOutput } from '@core/models/organization';
import type { OverviewToggleOption } from '../../organization-overview.types';

/**
 * Component OrganizationOverviewHeaderComponent
 * @class OrganizationOverviewHeaderComponent
 *
 * @description
 * Presentational header card for the organization overview page.
 * Displays the current organization identity, status badges and
 * top-level view-mode controls.
 *
 * Receives all display data from the parent container and emits
 * only the selected header mode. It does not access any store or
 * routing concern directly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-header',
  host: {
    style: 'display: block',
  },
  imports: [
    FormsModule,
    AvatarModule,
    ButtonModule,
    CardModule,
    SelectButtonModule,
    TagModule,
  ],
  templateUrl: './organization-overview-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewHeaderComponent {
  //#region Inputs
  /**
   * Input organization
   * @readonly
   *
   * @description
   * Current organization displayed in the header.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationOutput>}
   */
  public readonly organization: InputSignal<OrganizationOutput> =
    input.required<OrganizationOutput>();

  /**
   * Input modeOptions
   * @readonly
   *
   * @description
   * Available display modes for the top header switcher.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OverviewToggleOption[]>}
   */
  public readonly modeOptions: InputSignal<readonly OverviewToggleOption[]> =
    input.required<readonly OverviewToggleOption[]>();

  /**
   * Input activeMode
   * @readonly
   *
   * @description
   * Currently selected view mode value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly activeMode: InputSignal<string> =
    input.required<string>();

  /**
   * Input snapshotDateLabel
   * @readonly
   *
   * @description
   * Formatted date label displayed in the secondary button.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly snapshotDateLabel: InputSignal<string> =
    input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Output modeChange
   * @readonly
   *
   * @description
   * Emitted when the user selects a different header mode.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly modeChange: OutputEmitterRef<string> =
    output<string>();
  //#endregion

  //#region Properties
  /**
   * Property selectOptions
   * @readonly
   *
   * @description
   * Mutable clone of the mode options required by PrimeNG's
   * `p-selectbutton` input contract.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<OverviewToggleOption[]>}
   */
  protected readonly selectOptions: Signal<OverviewToggleOption[]> =
    computed<OverviewToggleOption[]>(() => [...this.modeOptions()]);
  //#endregion
}
