import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import {
  email as emailRule,
  form,
  FormField,
  maxLength,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import { PasswordInput } from '@shared/password-input';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import type { AccountEmailChangeFormValues } from './models';

/**
 * Constant EMAIL_MAX_LENGTH
 *
 * @description
 * Matches `RequestEmailChangeInput.newEmail`'s server-side bound
 * (`Assert\Length(max: 320)`).
 *
 * @since 1.0.0
 */
const EMAIL_MAX_LENGTH = 320;

/**
 * Component AccountEmailChangeForm
 * @class AccountEmailChangeForm
 *
 * @description
 * The email change request form: the new address and the current password,
 * which the backend verifies before it emails the confirmation link to the
 * new mailbox. The current password carries no policy rules — it is checked
 * against what is stored, like `AccountPasswordForm`'s step one.
 *
 * Presentational: it validates and emits {@link submitted}; the hosting
 * dialog and page own the store call (`ARCHITECTURE.md` §10.5). The draft is
 * cleared the moment {@link visible} turns false, and {@link initialEmail}
 * seeds the address when the dialog reopens to resend a link — the password
 * is never retained, which is why resending asks for it again.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-email-change-form
 *   [visible]="dialogVisible()"
 *   [pending]="store.isRequesting()"
 *   [initialEmail]="store.pendingEmail()"
 *   (submitted)="request($event)"
 *   (cancelled)="dialogVisible.set(false)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-email-change-form',
  imports: [RequiredMarker, FormField, PasswordInput, HlmButton, HlmInput, ...HlmFieldImports],
  templateUrl: './account-email-change-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountEmailChangeForm {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the hosting overlay is open. Watched to clear the draft the moment it closes, and to seed {@link initialEmail} when it opens.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the request is in flight, which locks the submit control.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property initialEmail
   * @readonly
   * @description Address to prefill when the dialog opens — the resend path reopens the dialog with the pending address, asking only for the password again.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly initialEmail: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the validated request payload.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<AccountEmailChangeFormValues>}
   */
  public readonly submitted: OutputEmitterRef<AccountEmailChangeFormValues> =
    output<AccountEmailChangeFormValues>();

  /**
   * Property cancelled
   * @readonly
   * @description The user backed out without requesting the change.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The form's value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<AccountEmailChangeFormValues>}
   */
  protected readonly model: WritableSignal<AccountEmailChangeFormValues> =
    signal<AccountEmailChangeFormValues>({ newEmail: '', currentPassword: '' });

  /**
   * Property changeForm
   * @readonly
   *
   * @description
   * The field tree. The new address mirrors the API bounds (valid address,
   * 320 characters at most); the current password only has to be present.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<AccountEmailChangeFormValues>}
   */
  protected readonly changeForm: FieldTree<AccountEmailChangeFormValues> = form(
    this.model,
    (path): void => {
      required(path.newEmail, {
        message: $localize`:@@account.email.newRequired:Enter the new email address`,
      });
      emailRule(path.newEmail, {
        message: $localize`:@@account.email.newInvalid:Enter a valid email address`,
      });
      maxLength(path.newEmail, EMAIL_MAX_LENGTH, {
        message: $localize`:@@account.email.newTooLong:The email address must not exceed 320 characters`,
      });
      required(path.currentPassword, {
        message: $localize`:@@account.email.passwordRequired:Enter your current password`,
      });
    },
  );

  /**
   * Property syncWithVisibility
   * @readonly
   *
   * @description
   * Clears the draft the moment {@link visible} turns false, so a reopened
   * dialog never resumes a discarded draft; seeds {@link initialEmail} when
   * it opens, so the resend path only asks for the password again.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly syncWithVisibility = effect((): void => {
    if (!this.visible()) {
      this.model.set({ newEmail: '', currentPassword: '' });
      this.changeForm().reset();
      return;
    }

    const seed: string | null = this.initialEmail();
    if (seed !== null && seed !== '') {
      this.model.set({ newEmail: seed, currentPassword: '' });
    }
  });
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Validates and emits the request payload.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The native submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    if (this.pending()) return;

    this.changeForm().markAsTouched();
    if (this.changeForm().invalid()) return;

    const { newEmail, currentPassword } = this.model();
    this.submitted.emit({ newEmail: newEmail.trim(), currentPassword });
  }
  //#endregion
}
