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
import type { StoreError } from '@core/request-state';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component ChannelDeleteDialog
 * @class ChannelDeleteDialog
 *
 * @description
 * Confirms deleting a channel — a plain alert-dialog, unlike
 * `OrganizationDeleteDialog`'s type-to-confirm gate: a channel carries no
 * cascade onto other organizations or billing, so a single confirm click is
 * proportionate (`DESIGN.md` "Action Surfaces" rule 5).
 *
 * Presentational: it emits {@link confirmed} and never calls the store
 * itself (`ARCHITECTURE.md` §10.3). The confirm stays open and busy-locked
 * until the write settles — `disableClose` follows {@link pending}, and a
 * failure surfaces inline through {@link error} rather than closing the
 * dialog, so the operator can retry without reopening it.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-channel-delete-dialog
 *   [visible]="deletePending()"
 *   [pending]="deleteDialogBusy()"
 *   [error]="deleteDialogError()"
 *   (visibleChange)="onDeleteDialogStateChanged($event ? 'open' : 'closed')"
 *   (confirmed)="confirmDelete()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-delete-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './channel-delete-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelDeleteDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the dialog is open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the delete write is in flight, busy-locking the footer and
   * blocking Escape/backdrop dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * The delete write's own error from a confirm attempted this session, or
   * `null`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * Reports the dialog opening or closing, including a dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property confirmed
   * @readonly
   *
   * @description
   * The operator confirmed the deletion.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal — Cancel, the backdrop or Escape — back to the page,
   * which owns the flag this is derived from. Ignored while the delete write
   * is in flight, matching the bound `disableClose`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method confirm
   * @method confirm
   *
   * @description
   * Emits the confirmed deletion, refused while a previous confirm is
   * already in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirm(): void {
    if (this.pending()) return;

    this.confirmed.emit();
  }
  //#endregion
}
