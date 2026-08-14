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
  email as emailRule,
  form,
  FormField,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import type { EmailRequestFormValues } from './models';

/**
 * Component EmailRequestForm
 * @class EmailRequestForm
 *
 * @description
 * A single email address and a submit control — the shape the password-reset
 * request needs. Deliberately its own form rather than a reduced sign-in form:
 * the two only look alike, and merging them would couple a public request to
 * credential handling.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-email-request-form [pending]="isRequesting()" (submitted)="request($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-email-request-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports],
  templateUrl: './email-request-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailRequestForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the request is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * What the submit control says, so the same form can serve more than one
   * request without inventing a variant.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly submitLabel: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the address once it is well-formed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<EmailRequestFormValues>}
   */
  public readonly submitted: OutputEmitterRef<EmailRequestFormValues> =
    output<EmailRequestFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited address.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<EmailRequestFormValues>}
   */
  protected readonly model: WritableSignal<EmailRequestFormValues> = signal<EmailRequestFormValues>(
    { email: '' },
  );

  /**
   * Property requestForm
   * @readonly
   *
   * @description
   * The field tree and its rules.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<EmailRequestFormValues>}
   */
  protected readonly requestForm: FieldTree<EmailRequestFormValues> = form(
    this.model,
    (path): void => {
      required(path.email, { message: $localize`:@@auth.email.required:Enter your email address` });
      emailRule(path.email, {
        message: $localize`:@@auth.email.invalid:Enter a valid email address`,
      });
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the field touched, then emits only if the address is well-formed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.requestForm().markAsTouched();

    if (this.requestForm().invalid()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
