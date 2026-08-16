import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component UnsavedChangesDialog
 * @class UnsavedChangesDialog
 *
 * @description
 * The one shared "discard your edits?" question, hosted declaratively by
 * any page or overlay that implements `UnsavedChangesAware` — a create page
 * deactivated by `unsavedChangesGuard`, or a dirty sheet/dialog confirming
 * before it closes. Fixed copy by design: this is a distinct, single-purpose
 * primitive explicitly exempt from the app's ban on generic shared confirm
 * wrappers (`DESIGN.md` § Action Surfaces) — that ban targets destructive
 * actions whose per-case wording is the point, not this one recurring
 * question.
 *
 * Fully caller-controlled: `state` is a plain input, never a two-way
 * `visibleChange`. The host owns the open/closed decision and reacts to
 * {@link confirmed} / {@link dismissed} to resolve its own pending
 * `confirmDeactivation()` promise or observable.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-unsaved-changes-dialog
 *   [state]="unsavedChangesDialogState()"
 *   (confirmed)="onUnsavedChangesConfirmed()"
 *   (dismissed)="onUnsavedChangesDismissed()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-unsaved-changes-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './unsaved-changes-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnsavedChangesDialog {
  //#region Inputs
  /**
   * Property state
   * @readonly
   *
   * @description
   * The overlay's open/closed state, fully owned by the host component.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<BrnDialogState>}
   */
  public readonly state: InputSignal<BrnDialogState> = input<BrnDialogState>('closed');
  //#endregion

  //#region Outputs
  /**
   * Property confirmed
   * @readonly
   *
   * @description
   * Emits once the reader activates the destructive "Discard" action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();

  /**
   * Property dismissed
   * @readonly
   *
   * @description
   * Emits when the reader closes the dialog without discarding — the
   * Cancel action, since `disableClose` blocks escape and backdrop
   * dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a Cancel-driven close back to the host as {@link dismissed}.
   * Discard closes through {@link discard} instead, so this only fires for
   * the Cancel action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === (this.state() === 'open')) return;

    if (!isOpen) this.dismissed.emit();
  }

  /**
   * Method discard
   * @method discard
   *
   * @description
   * Emits the confirmed discard back to the host.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected discard(): void {
    this.confirmed.emit();
  }
  //#endregion
}
