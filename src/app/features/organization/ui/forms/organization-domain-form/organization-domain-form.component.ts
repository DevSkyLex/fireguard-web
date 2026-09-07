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
  disabled,
  required,
  pattern,
  type FieldTree,
} from '@angular/forms/signals';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
/**
 * Component OrganizationDomainForm
 * @class OrganizationDomainForm
 * @description Collects an exact professional email domain; ownership and public-domain checks remain server-owned.
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-domain-form',
  imports: [FormField, HlmFieldImports, HlmInput, HlmButton],
  templateUrl: './organization-domain-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDomainForm {
  /**
   * Property pending
   * @readonly
   * @description Disables duplicate submissions.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property submitted
   * @readonly
   * @description Emits a domain for challenge creation.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output();
  /**
   * Property model
   * @readonly
   * @description Exact domain entry.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<{domain:string}>}
   */
  protected readonly model: WritableSignal<{ domain: string }> = signal({ domain: '' });
  /**
   * Property domainForm
   * @readonly
   * @description Required domain with client format validation.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<{domain:string}>}
   */
  protected readonly domainForm: FieldTree<{ domain: string }> = form(this.model, (path) => {
    disabled(path, () => this.pending());
    required(path.domain, {
      message: $localize`:@@org.access.domainRequired:Enter your company domain.`,
    });
    pattern(path.domain, /^[^\s/@:]+\.[^\s/@:]+$/, {
      message: $localize`:@@org.access.domainInvalid:Enter a domain such as company.com, without https:// or an email address.`,
    });
  });
  /**
   * Method submit
   * @method submit
   * @description Emits only a valid domain and retains the field when the server rejects it.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - Native submit.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.domainForm.domain().markAsTouched();
    if (!this.pending() && this.domainForm().valid())
      this.submitted.emit(this.model().domain.trim());
  }
}
