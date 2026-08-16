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

/**
 * Component InterventionSyncDiscardDialog
 * @class InterventionSyncDiscardDialog
 *
 * @description
 * The confirmation for discarding the offline outbox's blocked operations —
 * data loss, so it confirms (`DESIGN.md` "Action Surfaces" rule 5), as a
 * feature-local `ui/dialogs/` component rather than markup inlined in
 * `InterventionSyncIndicator`.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and takes
 * its open state from {@link visible}. `InterventionSyncIndicator` is its
 * host — the shell widget already carries a documented exception to inject
 * its own collaborators directly (it is a slot contribution, not
 * page-hosted), so it plays the "documented container component" role
 * `DESIGN.md` reserves for a non-page overlay host and keeps the
 * `discardBlocked()` call on {@link confirmed}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-sync-discard-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './intervention-sync-discard-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSyncDiscardDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the confirmation is open. Owned by the host.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property confirmed
   * @readonly
   * @description Discard was accepted.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();

  /**
   * Property dismissed
   * @readonly
   * @description The confirmation was closed without discarding — Escape, the backdrop, or Cancel.
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
