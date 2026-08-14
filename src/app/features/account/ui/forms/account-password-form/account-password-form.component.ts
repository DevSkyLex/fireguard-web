import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import {
  form,
  FormField,
  maxLength,
  pattern,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import type { AccountPasswordChangeStep } from '@features/account/state';
import { applyPasswordConfirmation, applyPasswordRules } from '@features/auth';
import { PasswordInput } from '@shared/password-input';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import type { AccountPasswordConfirmFormValues, AccountPasswordRequestFormValues } from './models';

/**
 * Constant CODE_PATTERN
 *
 * @description
 * The six digits of the emailed one-time code.
 *
 * @since 1.0.0
 */
const CODE_PATTERN = /^\d{6}$/;

/**
 * Constant CODE_LENGTH
 *
 * @description
 * Code length, kept in step with {@link CODE_PATTERN}.
 *
 * @since 1.0.0
 */
const CODE_LENGTH = 6;

/**
 * Component AccountPasswordForm
 * @class AccountPasswordForm
 *
 * @description
 * The whole password change, in one component driven by {@link step}: prove the
 * current password, then enter the emailed code alongside the new one.
 *
 * The two steps share a component rather than being split, because they are one
 * transaction from the user's point of view — the second is meaningless without
 * the first, and the challenge token that ties them together lives in the store
 * for exactly as long as the pair does.
 *
 * The password rules come from `@features/auth`, which is the single authority
 * mirroring the API's policy; restating them here would let the two drift.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-password-form
 *   [step]="store.step()"
 *   [pending]="store.isRequesting() || store.isConfirming()"
 *   [maskedRecipient]="store.maskedRecipient()"
 *   (requested)="request($event)"
 *   (confirmed)="confirm($event)"
 *   (restarted)="store.restart()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-password-form',
  imports: [FormField, PasswordInput, HlmButton, HlmInput, ...HlmFieldImports],
  templateUrl: './account-password-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPasswordForm {
  //#region Inputs
  /**
   * Property step
   * @readonly
   *
   * @description
   * Which stage of the change is on screen, owned by the store because the
   * challenge token it depends on is store state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<AccountPasswordChangeStep>}
   */
  public readonly step: InputSignal<AccountPasswordChangeStep> =
    input.required<AccountPasswordChangeStep>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the current step is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property maskedRecipient
   * @readonly
   *
   * @description
   * The partly hidden address the code went to. Shown so a user with several
   * addresses knows which inbox to open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly maskedRecipient: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property requested
   * @readonly
   *
   * @description
   * Emits the current password, to be verified before a code is sent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly requested: OutputEmitterRef<string> = output<string>();

  /**
   * Property confirmed
   * @readonly
   *
   * @description
   * Emits the code and the new password. `confirmPassword` is deliberately
   * absent: it is a form concern, not part of the API contract.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<{ code: string; newPassword: string }>}
   */
  public readonly confirmed: OutputEmitterRef<{ code: string; newPassword: string }> = output<{
    code: string;
    newPassword: string;
  }>();

  /**
   * Property restarted
   * @readonly
   *
   * @description
   * Emits when the user wants to begin again, either after succeeding or after
   * losing the emailed code.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly restarted: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property requestModel
   * @readonly
   *
   * @description
   * Step one's value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<AccountPasswordRequestFormValues>}
   */
  protected readonly requestModel: WritableSignal<AccountPasswordRequestFormValues> =
    signal<AccountPasswordRequestFormValues>({ currentPassword: '' });

  /**
   * Property requestForm
   * @readonly
   *
   * @description
   * Step one's field tree. The current password carries no policy rules:
   * it is checked against what is stored, and echoing the complexity
   * requirements at an existing password only helps someone guessing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<AccountPasswordRequestFormValues>}
   */
  protected readonly requestForm: FieldTree<AccountPasswordRequestFormValues> = form(
    this.requestModel,
    (path): void => {
      required(path.currentPassword, {
        message: $localize`:@@account.password.currentRequired:Enter your current password`,
      });
    },
  );

  /**
   * Property confirmModel
   * @readonly
   *
   * @description
   * Step two's values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<AccountPasswordConfirmFormValues>}
   */
  protected readonly confirmModel: WritableSignal<AccountPasswordConfirmFormValues> =
    signal<AccountPasswordConfirmFormValues>({
      code: '',
      newPassword: '',
      confirmPassword: '',
    });

  /**
   * Property confirmForm
   * @readonly
   *
   * @description
   * Step two's field tree.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<AccountPasswordConfirmFormValues>}
   */
  protected readonly confirmForm: FieldTree<AccountPasswordConfirmFormValues> = form(
    this.confirmModel,
    (path): void => {
      required(path.code, {
        message: $localize`:@@account.password.codeRequired:Enter the code we emailed you`,
      });
      maxLength(path.code, CODE_LENGTH);
      pattern(path.code, CODE_PATTERN, {
        message: $localize`:@@account.password.codePattern:The code is ${CODE_LENGTH}:length: digits`,
      });

      applyPasswordRules(path.newPassword);
      applyPasswordConfirmation(path.confirmPassword, path.newPassword);
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method submitRequest
   * @method submitRequest
   *
   * @description
   * Marks step one touched, then emits the current password if it is filled.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The native submit event.
   *
   * @returns {void}
   */
  protected submitRequest(event: Event): void {
    event.preventDefault();

    this.requestForm().markAsTouched();

    if (this.requestForm().invalid()) return;

    this.requested.emit(this.requestModel().currentPassword);
  }

  /**
   * Method submitConfirm
   * @method submitConfirm
   *
   * @description
   * Marks step two touched, then emits the code and the new password.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The native submit event.
   *
   * @returns {void}
   */
  protected submitConfirm(event: Event): void {
    event.preventDefault();

    this.confirmForm().markAsTouched();

    if (this.confirmForm().invalid()) return;

    const { code, newPassword } = this.confirmModel();
    this.confirmed.emit({ code, newPassword });
  }

  /**
   * Method restart
   * @method restart
   *
   * @description
   * Clears both steps and asks the parent to reset the workflow. The fields are
   * wiped here rather than left behind, because a password typed into a form
   * that is no longer live has no reason to stay in memory.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected restart(): void {
    this.requestModel.set({ currentPassword: '' });
    this.confirmModel.set({ code: '', newPassword: '', confirmPassword: '' });
    this.requestForm().reset();
    this.confirmForm().reset();

    this.restarted.emit();
  }
  //#endregion
}
