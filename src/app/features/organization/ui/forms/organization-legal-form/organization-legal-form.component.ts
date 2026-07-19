import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, type FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import type { OrganizationOutput, UpdateOrganizationInput } from '@features/organization/models';

/**
 * The legal form's own value shape.
 *
 * @since 1.0.0
 */
interface LegalFormValue {
  readonly legalName: string;
  readonly legalType: string;
  readonly registrationNumber: string;
  readonly vatNumber: string;
  readonly country: string;
}

/**
 * Component OrganizationLegalForm
 * @class OrganizationLegalForm
 *
 * @description
 * The organization's legal identity — registered name, entity type,
 * registration and VAT numbers, country — used on reports, invoices and
 * compliance exports.
 *
 * Every field is optional: an organization is usable long before its legal
 * identity is filled in, and requiring it here would block onboarding.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-legal-form [organization]="org()" (submitted)="save($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-legal-form',
  imports: [ButtonModule, ReactiveFormsModule, InputTextModule],
  templateUrl: './organization-legal-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLegalForm {
  //#region Inputs
  /**
   * Property organization
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationOutput | null>}
   */
  public readonly organization: InputSignal<OrganizationOutput | null> =
    input<OrganizationOutput | null>(null);

  /**
   * Property saving
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<UpdateOrganizationInput>}
   */
  public readonly submitted: OutputEmitterRef<UpdateOrganizationInput> =
    output<UpdateOrganizationInput>();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup}
   */
  protected readonly form: FormGroup = this.formBuilder.group({
    legalName: this.formBuilder.control<string>(''),
    legalType: this.formBuilder.control<string>(''),
    registrationNumber: this.formBuilder.control<string>(''),
    vatNumber: this.formBuilder.control<string>(''),
    country: this.formBuilder.control<string>(''),
  });
  //#endregion

  //#region Lifecycle
  /**
   * Refills the form whenever the organization resolves or changes.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organization: OrganizationOutput | null = this.organization();
      if (organization === null) return;

      this.form.reset({
        legalName: organization.legalName ?? '',
        legalType: organization.legalType ?? '',
        registrationNumber: organization.registrationNumber ?? '',
        vatNumber: organization.vatNumber ?? '',
        country: organization.country ?? '',
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSubmit
   *
   * @description
   * Emits the legal profile.
   *
   * Empty strings are sent rather than omitted: the backend clears a field when
   * it receives `''`, so dropping a blank would silently keep the old value the
   * user just erased.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    const value: LegalFormValue = this.form.getRawValue() as LegalFormValue;

    this.submitted.emit({
      legalName: value.legalName.trim(),
      legalType: value.legalType.trim(),
      registrationNumber: value.registrationNumber.trim(),
      vatNumber: value.vatNumber.trim(),
      country: value.country.trim().toUpperCase(),
    });
  }
  //#endregion
}
