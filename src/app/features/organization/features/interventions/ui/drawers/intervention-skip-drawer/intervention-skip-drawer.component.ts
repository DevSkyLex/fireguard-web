import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef } from '@angular/core';
import { DrawerModule, type DrawerPassThroughOptions } from 'primeng/drawer';
import {
  InterventionSkipForm,
  type InterventionSkipFormValues,
} from '@features/organization/features/interventions/ui/forms';

/**
 * Component InterventionSkipDrawer
 * @class InterventionSkipDrawer
 *
 * @description
 * Presentational bottom drawer hosting the {@link InterventionSkipForm} used to
 * record why a planned work item cannot be completed during field execution.
 * Owns only the drawer shell and forwards visibility, loading and disabled state
 * through inputs while emitting the captured reason and visibility changes
 * through outputs. All orchestration (which work item, persistence) stays with
 * the parent panel.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-skip-drawer',
  imports: [DrawerModule, InterventionSkipForm],
  templateUrl: './intervention-skip-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSkipDrawer {
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
   * Whether a skip request is in flight; locks the form and the drawer.
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
   * Emits the validated skip reason when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionSkipFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionSkipFormValues> =
    output<InterventionSkipFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property drawerPt
   * @readonly
   *
   * @description
   * PrimeNG drawer pass-through options sizing the right panel responsively:
   * full width on mobile, compact on larger viewports.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DrawerPassThroughOptions}
   */
  protected readonly drawerPt: DrawerPassThroughOptions = {
    root: { class: '!w-full sm:!w-[34rem]' },
  };
  //#endregion
}
