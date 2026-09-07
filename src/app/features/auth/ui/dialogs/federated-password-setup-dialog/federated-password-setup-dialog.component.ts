import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
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
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { PasswordSetupConfirmInput } from '@features/auth/models';
import { applyPasswordConfirmation, applyPasswordRules } from '@features/auth/validators';
import { PasswordInput } from '@shared/password-input';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Interface PasswordSetupFormValues
 * @interface PasswordSetupFormValues
 *
 * @description
 * Signal Forms model for verifying an email code and setting a first password.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
interface PasswordSetupFormValues {
  /**
   * Property code
   * @readonly
   *
   * @description Six-digit email verification code.
   * @since 1.0.0
   * @type {string}
   */
  readonly code: string;

  /**
   * Property password
   * @readonly
   *
   * @description Requested local password.
   * @since 1.0.0
   * @type {string}
   */
  readonly password: string;

  /**
   * Property confirmPassword
   * @readonly
   *
   * @description Repeated password used for confirmation.
   * @since 1.0.0
   * @type {string}
   */
  readonly confirmPassword: string;
}

/**
 * Constant CODE_PATTERN
 * @readonly
 *
 * @description
 * Exact format accepted by the email OTP verification endpoint.
 *
 * @since 1.0.0
 * @type {RegExp}
 */
const CODE_PATTERN: RegExp = /^\d{6}$/;

/**
 * Component FederatedPasswordSetupDialog
 * @class FederatedPasswordSetupDialog
 *
 * @description
 * Signal Forms dialog for creating a first local password after an email OTP
 * challenge. The owning page performs transport operations.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-federated-password-setup-dialog',
  imports: [
    FormField,
    PasswordInput,
    RequiredMarker,
    HlmButton,
    HlmInput,
    HlmSpinner,
    ...HlmDialogImports,
    ...HlmFieldImports,
  ],
  templateUrl: './federated-password-setup-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FederatedPasswordSetupDialog {
  /**
   * Property visible
   * @readonly
   *
   * @description Whether the dialog is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input(false);

  /**
   * Property challengeToken
   * @readonly
   *
   * @description Opaque token paired with the emailed code.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly challengeToken: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property maskedRecipient
   * @readonly
   *
   * @description Masked email address receiving the code.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly maskedRecipient: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property requestPending
   * @readonly
   *
   * @description Whether the challenge request is pending.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly requestPending: InputSignal<boolean> = input(false);

  /**
   * Property confirmPending
   * @readonly
   *
   * @description Whether OTP verification is pending.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly confirmPending: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description Current request or confirmation error.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property visibleChange
   * @readonly
   *
   * @description Emits native dialog visibility changes.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property codeRequested
   * @readonly
   *
   * @description Emits when the user requests an email code.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly codeRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property submitted
   * @readonly
   *
   * @description Emits the validated password setup payload.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<PasswordSetupConfirmInput>}
   */
  public readonly submitted: OutputEmitterRef<PasswordSetupConfirmInput> =
    output<PasswordSetupConfirmInput>();

  /**
   * Property restartRequested
   * @readonly
   *
   * @description Emits when the current OTP must be replaced with a new challenge.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly restartRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property dialogState
   * @readonly
   *
   * @description Spartan dialog state derived from page-owned visibility.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property model
   * @readonly
   *
   * @description Mutable Signal Forms value model.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<PasswordSetupFormValues>}
   */
  protected readonly model: WritableSignal<PasswordSetupFormValues> =
    signal<PasswordSetupFormValues>({ code: '', password: '', confirmPassword: '' });

  /**
   * Property passwordForm
   * @readonly
   *
   * @description Validated field tree for code and password rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<PasswordSetupFormValues>}
   */
  protected readonly passwordForm: FieldTree<PasswordSetupFormValues> = form(this.model, (path) => {
    required(path.code, {
      message: $localize`:@@account.signInMethods.codeRequired:Enter the code we emailed you`,
    });
    maxLength(path.code, 6);
    pattern(path.code, CODE_PATTERN, {
      message: $localize`:@@account.signInMethods.codePattern:Enter the six-digit code`,
    });
    applyPasswordRules(path.password);
    applyPasswordConfirmation(path.confirmPassword, path.password);
  });

  /**
   * Method onStateChanged
   * @method onStateChanged
   * @description Keeps Spartan state and page-owned visibility in sync.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - Latest dialog visibility state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen = state === 'open';
    if (!isOpen) this.resetModel();
    if (isOpen !== this.visible()) this.visibleChange.emit(isOpen);
  }

  /**
   * Method restart
   * @method restart
   *
   * @description Clears entered values and asks the owning page for a fresh OTP.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected restart(): void {
    this.resetModel();
    this.restartRequested.emit();
  }

  /**
   * Method submit
   * @method submit
   * @description Validates the Signal Form and emits the transport-ready payload.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - Native form submission event.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.passwordForm().markAsTouched();
    const token = this.challengeToken();
    if (!token || this.passwordForm().invalid() || this.confirmPending()) return;
    const values = this.model();
    this.submitted.emit({ token, code: values.code, newPassword: values.password });
  }

  /**
   * Method resetModel
   * @method resetModel
   *
   * @description Restores the Signal Forms values for a new setup attempt.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private resetModel(): void {
    this.model.set({ code: '', password: '', confirmPassword: '' });
  }
}
