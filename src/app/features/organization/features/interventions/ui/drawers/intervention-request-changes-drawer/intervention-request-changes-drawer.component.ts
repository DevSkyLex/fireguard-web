import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { InputSignal, OutputEmitterRef, Signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import {
  InterventionRequestChangesForm,
  type InterventionRequestChangesFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { DRAWER_STYLE_CLASS } from '@shared/overlay-size';

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
  host: {
    '(document:keydown.escape)': 'onEscape($event)',
  },
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
   * Property serverError
   * @readonly
   *
   * @description
   * Last submission failure, forwarded to the form so a 422 lands on the field the
   * server named. The drawer only relays it; it owns no error handling.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

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
   * Property drawerStyleClass
   * @readonly
   *
   * @description
   * Canonical `p-drawer` width (DESIGN.md, "Overlays — sizes"): full width on
   * mobile, a fixed comfortable width above.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {string}
   */
  protected readonly drawerStyleClass: string = DRAWER_STYLE_CLASS;
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
   * @type {Signal<InterventionRequestChangesForm | undefined>}
   */
  private readonly formRef: Signal<InterventionRequestChangesForm | undefined> = viewChild(
    InterventionRequestChangesForm,
  );

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
