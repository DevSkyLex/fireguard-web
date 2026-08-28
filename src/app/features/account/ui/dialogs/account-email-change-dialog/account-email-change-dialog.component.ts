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
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogDescription,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import {
  AccountEmailChangeForm,
  type AccountEmailChangeFormValues,
} from '../../forms/account-email-change-form';

/**
 * Component AccountEmailChangeDialog
 * @class AccountEmailChangeDialog
 *
 * @description
 * The spartan dialog hosting {@link AccountEmailChangeForm}, the shape
 * `ChecklistCreateDialog` wraps `ChecklistCreateForm` in.
 *
 * Purely presentational: it owns the overlay chrome, forwards
 * `visible`/`visibleChange`, `pending` and `initialEmail` to the form, and
 * re-emits {@link submitted} — the page calls the store and closes this
 * dialog once the request is accepted (`ARCHITECTURE.md` §10.5). Dismissal
 * is blocked while the request is in flight. `initialEmail` carries the
 * pending address on the resend path, so only the password is asked again —
 * it is never retained client-side.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-email-change-dialog
 *   [visible]="changingEmail()"
 *   [pending]="emailChangeStore.isRequesting()"
 *   [initialEmail]="emailChangeStore.pendingEmail()"
 *   (visibleChange)="changingEmail.set($event)"
 *   (submitted)="requestEmailChange($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-email-change-dialog',
  imports: [
    AccountEmailChangeForm,
    HlmDialog,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
  ],
  templateUrl: './account-email-change-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountEmailChangeDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the request is in flight, forwarded to the form and blocking dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property initialEmail
   * @readonly
   * @description Address to prefill on open — the resend path, which asks only for the password again.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly initialEmail: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Reports the dialog opening or closing, including a dismissal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The form's validated request payload, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<AccountEmailChangeFormValues>}
   */
  public readonly submitted: OutputEmitterRef<AccountEmailChangeFormValues> =
    output<AccountEmailChangeFormValues>();
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
   * @description Reports a dismissal back to the page. Ignored while a request is in flight, matching the bound `disableClose`.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
