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
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { InterventionRecurrenceOutput } from '@features/organization/features/interventions/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component InterventionRecurrenceDeleteDialog
 * @class InterventionRecurrenceDeleteDialog
 *
 * @description
 * The delete confirmation for an intervention recurrence (`DESIGN.md`
 * "Action Surfaces" rule 5 — a destructive action confirms). Deleting a
 * recurrence stops it from drafting further interventions; interventions it
 * already materialized are kept.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and takes
 * its open state from {@link recurrence} being non-null.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-recurrence-delete-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './intervention-recurrence-delete-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionRecurrenceDeleteDialog {
  //#region Inputs
  /**
   * Property recurrence
   * @readonly
   * @description The recurrence pending deletion, or `null` to keep the dialog closed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionRecurrenceOutput | null>}
   */
  public readonly recurrence: InputSignal<InterventionRecurrenceOutput | null> =
    input<InterventionRecurrenceOutput | null>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether the delete request is in flight, disabling the confirm action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property confirmed
   * @readonly
   * @description The confirmed recurrence, for the page to delete.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionRecurrenceOutput>}
   */
  public readonly confirmed: OutputEmitterRef<InterventionRecurrenceOutput> =
    output<InterventionRecurrenceOutput>();

  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed without deleting — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The dialog state, derived from {@link recurrence} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.recurrence() === null ? 'closed' : 'open',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop — as {@link dismissed}. The
   * `open` transition is only ever the caller setting {@link recurrence}, so
   * it is ignored here.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The dialog's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.dismissed.emit();
  }

  /**
   * Method confirm
   * @description Emits {@link confirmed} for the pending recurrence. A no-op without one.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirm(): void {
    const target: InterventionRecurrenceOutput | null = this.recurrence();
    if (target === null) return;

    this.confirmed.emit(target);
  }
  //#endregion
}
