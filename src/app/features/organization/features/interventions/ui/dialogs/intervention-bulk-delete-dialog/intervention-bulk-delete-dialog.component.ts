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
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';

/**
 * Component InterventionBulkDeleteDialog
 * @class InterventionBulkDeleteDialog
 *
 * @description
 * The delete confirmation opened from the interventions list — one
 * `hlm-alert-dialog` for both the row-level and the bulk-selection flow, the
 * caller supplying whichever title, body, and count already name the target
 * (`DESIGN.md` "Action Surfaces" rule 5: every destructive action confirms,
 * as a feature-local `ui/dialogs/` component, never inline page markup).
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and takes
 * its open state from {@link visible}. The page keeps every write — which
 * target(s) are pending, and what `store.delete` is called with.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-bulk-delete-dialog',
  imports: [HlmButton, ...HlmAlertDialogImports],
  templateUrl: './intervention-bulk-delete-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionBulkDeleteDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the confirmation is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property title
   * @readonly
   * @description The confirmation's heading, already naming the row or the selection count.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input<string>('');

  /**
   * Property description
   * @readonly
   * @description The confirmation's body, already naming the row or counting the selection.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly description: InputSignal<string> = input<string>('');

  /**
   * Property errorMessage
   * @readonly
   * @description What the last delete attempt failed with, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly errorMessage: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property busy
   * @readonly
   * @description Whether the caller's delete write is in flight, which disables confirming again.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property confirmed
   * @readonly
   * @description Delete was accepted.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();

  /**
   * Property dismissed
   * @readonly
   * @description The confirmation was closed without deleting — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The dialog state, derived from {@link visible} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop — as {@link dismissed}. The
   * `open` transition is only ever the caller setting {@link visible}, so it
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
  //#endregion
}
