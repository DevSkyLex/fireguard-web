import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef } from '@angular/core';
import { DrawerModule, type DrawerPassThroughOptions } from 'primeng/drawer';
import type { SelectOption } from '@features/organization/features/interventions/models';
import {
  InterventionDiscoveryForm,
  type InterventionDiscoveryFormValues,
} from '@features/organization/features/interventions/ui/forms';

/**
 * Component InterventionDiscoveryDrawer
 * @class InterventionDiscoveryDrawer
 *
 * @description
 * Presentational bottom drawer hosting the {@link InterventionDiscoveryForm}
 * used to record work discovered on site that was not part of the prepared
 * scope. Owns only the drawer shell and forwards visibility, loading, disabled
 * state and the equipment-type options through inputs while emitting the
 * validated discovery and visibility changes through outputs. All orchestration
 * (persistence) stays with the parent panel.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-discovery-drawer',
  imports: [DrawerModule, InterventionDiscoveryForm],
  templateUrl: './intervention-discovery-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionDiscoveryDrawer {
  //#region Inputs
  /**
   * Input visible
   * @readonly
   *
   * @description
   * Whether the drawer is currently open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether a discovery request is in flight; locks the form and the drawer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input disabled
   * @readonly
   *
   * @description
   * Whether the form is disabled (e.g. the current user may not execute field
   * actions).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input equipmentTypeOptions
   * @readonly
   *
   * @description
   * Valid equipment type choices forwarded to the discovery form so an
   * `inventory` discovery always submits an accepted equipment type.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly equipmentTypeOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Output visibleChange
   * @readonly
   *
   * @description
   * Emits the new visibility state when the drawer is opened or dismissed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Output submitted
   * @readonly
   *
   * @description
   * Emits the validated discovery values when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionDiscoveryFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionDiscoveryFormValues> =
    output<InterventionDiscoveryFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property drawerPt
   * @readonly
   *
   * @description
   * PrimeNG drawer pass-through options sizing the bottom panel for the field
   * context: a compact fixed height capped at the available viewport height.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DrawerPassThroughOptions}
   */
  protected readonly drawerPt: DrawerPassThroughOptions = {
    root: { class: '!h-[30rem] !max-h-[90dvh]' },
  };
  //#endregion
}
