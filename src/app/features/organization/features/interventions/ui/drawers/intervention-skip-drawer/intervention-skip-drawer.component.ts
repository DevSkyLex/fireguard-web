import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { InputSignal, OutputEmitterRef, Signal } from '@angular/core';
import { DrawerModule, type DrawerPassThroughOptions } from 'primeng/drawer';
import { INTERVENTION_DRAWER_PT } from '@features/organization/features/interventions/constants';
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
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
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
  protected readonly drawerPt: DrawerPassThroughOptions = INTERVENTION_DRAWER_PT;
  //#endregion

  //#region Dismissal guard
  /**
   * Property formRef
   * @readonly
   *
   * @description
   * Composed form component, observed for unsaved edits.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<InterventionSkipForm | undefined>}
   */
  private readonly formRef: Signal<InterventionSkipForm | undefined> =
    viewChild(InterventionSkipForm);

  /**
   * Property canDismiss
   * @readonly
   *
   * @description
   * Whether accidental dismissal (Esc, backdrop tap) may close the drawer:
   * blocked while a request is in flight or the form holds unsaved edits, so
   * a mis-tap never silently discards field input.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDismiss: Signal<boolean> = computed<boolean>(
    () => !this.loading() && !(this.formRef()?.dirty() ?? false),
  );

  /**
   * Method onEscape
   * @method onEscape
   *
   * @description
   * Dirty-aware Escape handling (PrimeNG's own escape listener is bound at
   * open time and closes unconditionally, so it stays disabled): closes the
   * drawer only while {@link canDismiss} holds.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {Event} event - Document-level Escape keydown.
   *
   * @return {void}
   */
  protected onEscape(event: Event): void {
    if (event.defaultPrevented || !this.visible()) return;
    if (!this.canDismiss()) return;
    this.visibleChange.emit(false);
  }
  //#endregion
}
