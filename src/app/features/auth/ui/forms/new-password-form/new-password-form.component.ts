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
import { form, type FieldTree } from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import { applyPasswordConfirmation, applyPasswordRules } from '@features/auth/validators';
import { PasswordInput } from '@shared/password-input';
import { RequiredMarker } from '@shared/required-marker';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSpinner } from '@shared/ui/spinner';
import type { NewPasswordFormValues } from './models';

/**
 * Component NewPasswordForm
 * @class NewPasswordForm
 *
 * @description
 * Sets a new password and confirms it. It shares the feature's password
 * validators with registration, so the policy cannot drift between the two
 * surfaces that write a password (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-new-password-form [pending]="isConfirming()" (submitted)="reset($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-new-password-form',
  imports: [
    ...HlmAlertImports,
    RequiredMarker,
    PasswordInput,
    HlmButton,
    HlmSpinner,
    ...HlmFieldImports,
  ],
  templateUrl: './new-password-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewPasswordForm {
  /** @description Request failures are displayed inline above the fields. */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the reset request is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the new password once both fields agree.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<NewPasswordFormValues>}
   */
  public readonly submitted: OutputEmitterRef<NewPasswordFormValues> =
    output<NewPasswordFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<NewPasswordFormValues>}
   */
  protected readonly model: WritableSignal<NewPasswordFormValues> = signal<NewPasswordFormValues>({
    password: '',
    confirmPassword: '',
  });

  /**
   * Property passwordForm
   * @readonly
   *
   * @description
   * The field tree and its rules.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<NewPasswordFormValues>}
   */
  protected readonly passwordForm: FieldTree<NewPasswordFormValues> = form(
    this.model,
    (path): void => {
      applyPasswordRules(path.password);
      applyPasswordConfirmation(path.confirmPassword, path.password);
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the form touched, then emits only if it is valid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.passwordForm().markAsTouched();

    if (this.passwordForm().invalid()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
