import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef } from '@angular/core';
import { DrawerModule, type DrawerPassThroughOptions } from 'primeng/drawer';
import {
  InterventionRequestChangesForm,
  type InterventionRequestChangesFormValues,
} from '@features/organization/features/interventions/ui/forms';

/**
 * Component InterventionRequestChangesDrawer
 * @class InterventionRequestChangesDrawer
 *
 * @description
 * Presentational side drawer hosting the {@link InterventionRequestChangesForm}
 * used by a reviewer to return a submitted intervention for corrections with a
 * specific note. Owns only the drawer shell and forwards visibility, loading and
 * disabled state through inputs while emitting the captured note and visibility
 * changes through outputs. All orchestration (the status transition) stays with
 * the parent panel.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-request-changes-drawer',
  imports: [DrawerModule, InterventionRequestChangesForm],
  templateUrl: './intervention-request-changes-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionRequestChangesDrawer {
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
   * Whether a request-changes transition is in flight; locks the form and drawer.
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
   * Whether requesting changes is forbidden (e.g. the current user may not
   * review) or the intervention is not awaiting a decision.
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
   * Emits the validated review note when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionRequestChangesFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionRequestChangesFormValues> =
    output<InterventionRequestChangesFormValues>();
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
