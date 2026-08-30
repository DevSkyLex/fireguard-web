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
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component InterventionAbandonDialog
 * @class InterventionAbandonDialog
 *
 * @description
 * The confirmation for abandoning an intervention — its own surface rather
 * than a variant of the shared text confirmation, because `DESIGN.md`
 * "Action Surfaces" rule 5 makes per-case wording the point, and this is the
 * one transition on the lifecycle that is terminal and read-only. Rendering
 * it identically to "skip a work item" taught the operator to click through
 * both.
 *
 * It collects nothing. The workflow discards any note on an `abandoned`
 * transition (only `changes_requested` keeps one), so a reason field here
 * would take text and throw it away.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and takes
 * its open state from {@link request} being non-null.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-abandon-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './intervention-abandon-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionAbandonDialog {
  //#region Inputs
  /**
   * Property request
   * @readonly
   * @description The intervention pending abandonment, or `null` to keep the dialog closed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionOutput | null>}
   */
  public readonly request: InputSignal<InterventionOutput | null> =
    input<InterventionOutput | null>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether the transition is in flight, which locks the dialog open and disables accepting again.
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
   * @description The abandonment was confirmed, for the page to dispatch the transition.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();

  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed without abandoning — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The dialog state, derived from {@link request} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.request() === null ? 'closed' : 'open',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop — as {@link dismissed}. The
   * `open` transition is only ever the caller setting {@link request}, so it
   * is ignored here.
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
   * @description Emits {@link confirmed}. A no-op while the transition is already in flight.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirm(): void {
    if (this.request() === null || this.pending()) return;

    this.confirmed.emit();
  }
  //#endregion
}
