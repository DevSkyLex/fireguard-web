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
import { RouterLink } from '@angular/router';
import type { StoreError } from '@core/request-state';
import { PasswordInput } from '@shared/password-input';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import type { LoginFormValues } from './models';

/**
 * Component LoginForm
 * @class LoginForm
 *
 * @description
 * The sign-in credentials form. It owns its model, its rules and its own
 * validity; it emits {@link submitted} with the typed values and lets the page
 * call the store (`ARCHITECTURE.md` §10.4).
 *
 * Errors surface only once a field has been touched, so a blank form does not
 * greet the user in red.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-login-form [pending]="isLoggingIn()" (submitted)="login($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-login-form',
  imports: [
    RouterLink,
    FormField,
    PasswordInput,
    HlmButton,
    HlmCheckbox,
    HlmInput,
    ...HlmFieldImports,
  ],
  templateUrl: './login-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a sign-in attempt is in flight, which disables the submit control.
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
   * Whatever the store's sign-in call failed with, rendered above the fields
   * so a rejected attempt is never silent. `null` while nothing has failed.
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
   * Emits the typed credentials once the form is valid.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<LoginFormValues>}
   */
  public readonly submitted: OutputEmitterRef<LoginFormValues> = output<LoginFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values. `form()` writes through to this signal rather than
   * keeping a copy, so it is the single source of truth.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<LoginFormValues>}
   */
  protected readonly model: WritableSignal<LoginFormValues> = signal<LoginFormValues>({
    email: '',
    password: '',
    rememberMe: false,
  });

  /**
   * Property loginForm
   * @readonly
   *
   * @description
   * The field tree and its rules. The password carries no policy rules here:
   * sign-in checks a password that already exists, and echoing the complexity
   * requirements at an existing account only helps someone guessing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<LoginFormValues>}
   */
  protected readonly loginForm: FieldTree<LoginFormValues> = form(this.model, (path): void => {
    required(path.email, { message: $localize`:@@auth.email.required:Enter your email address` });
    email(path.email, { message: $localize`:@@auth.email.invalid:Enter a valid email address` });
    required(path.password, {
      message: $localize`:@@auth.login.passwordRequired:Enter your password`,
    });
  });
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

    this.loginForm().markAsTouched();

    if (this.loginForm().invalid()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
