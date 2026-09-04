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
import { email, form, FormField, required, type FieldTree } from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import { applyPasswordConfirmation, applyPasswordRules } from '@features/auth/validators';
import { PasswordInput } from '@shared/password-input';
import { RequiredMarker } from '@shared/required-marker';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';
import type { RegisterFormValues } from './models';

/**
 * Component RegisterForm
 * @class RegisterForm
 *
 * @description
 * The account-creation form. The password rules and the confirmation rule come
 * from the feature's shared validators, so this form cannot drift from the
 * API's policy or from the reset flow (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-register-form [pending]="isRegistering()" (submitted)="register($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-register-form',
  imports: [
    ...HlmAlertImports,
    RequiredMarker,
    FormField,
    PasswordInput,
    HlmButton,
    HlmSpinner,
    HlmInput,
    ...HlmFieldImports,
  ],
  templateUrl: './register-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the registration request is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Whatever the store's account-creation call failed with, rendered above
   * the fields so a rejected attempt is never silent. `null` while nothing
   * has failed.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the typed values once the form is valid.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<RegisterFormValues>}
   */
  public readonly submitted: OutputEmitterRef<RegisterFormValues> = output<RegisterFormValues>();
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
   * @type {WritableSignal<RegisterFormValues>}
   */
  protected readonly model: WritableSignal<RegisterFormValues> = signal<RegisterFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  /**
   * Property registerForm
   * @readonly
   *
   * @description
   * The field tree and its rules.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<RegisterFormValues>}
   */
  protected readonly registerForm: FieldTree<RegisterFormValues> = form(
    this.model,
    (path): void => {
      required(path.firstName, {
        message: $localize`:@@auth.firstName.required:Enter your first name`,
      });
      required(path.lastName, {
        message: $localize`:@@auth.lastName.required:Enter your last name`,
      });
      required(path.email, { message: $localize`:@@auth.email.required:Enter your email address` });
      email(path.email, { message: $localize`:@@auth.email.invalid:Enter a valid email address` });

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
   * Marks the form touched so every failing rule becomes visible, then emits
   * only if it is valid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.registerForm().markAsTouched();

    if (this.registerForm().invalid()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
