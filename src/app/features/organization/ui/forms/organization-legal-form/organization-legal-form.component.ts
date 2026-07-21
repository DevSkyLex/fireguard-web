import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import type { Observable } from 'rxjs';
import type { OptionOutput } from '@core/api/models';
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
 * How many legal fields currently carry a value, out of the total field count.
 * Emitted so the hosting page can render a completeness indicator in its own
 * section header rather than duplicating the form's internal field count.
 *
 * @since 1.3.0
 */
export interface LegalFormCompleteness {
  readonly filled: number;
  readonly total: number;
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
  imports: [ButtonModule, ReactiveFormsModule, InputTextModule, SelectModule],
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

  /**
   * Property legalTypes
   * @readonly
   *
   * @description
   * Legal entity types the API accepts, supplied by the page.
   *
   * Passed in rather than fetched here: a `ui/forms` component owns form state
   * and no API access (ARCHITECTURE §9.4). Injecting the service worked until
   * the spec asked for `ENV_CONFIG` — the boundary held, loudly.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<readonly OptionOutput[]>}
   */
  public readonly legalTypes: InputSignal<readonly OptionOutput[]> = input<readonly OptionOutput[]>(
    [],
  );
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

  /**
   * Property completenessChange
   * @readonly
   *
   * @description
   * Emits the current field-completeness count whenever it changes, so the
   * hosting page can render it in its own section header (ARCHITECTURE §9.4 —
   * the form manages its own state but may surface it through an output).
   *
   * @access public
   * @since 1.3.0
   *
   * @type {OutputEmitterRef<LegalFormCompleteness>}
   */
  public readonly completenessChange: OutputEmitterRef<LegalFormCompleteness> =
    output<LegalFormCompleteness>();
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
    // Mirrors the server's own constraint on this field
    // (`Assert\Regex('/^[A-Za-z]{2}$/')` on UpdateOrganizationSettingsInput).
    // Without it the field accepted "1A" and the user learned it was wrong
    // from a rejected save — the field was shaped like an ISO code (maxlength,
    // uppercase, a hint naming FR) while enforcing none of it.
    //
    // Empty stays valid: the whole legal profile is optional, and the backend
    // clears the field on an empty string.
    country: this.formBuilder.control<string>('', [Validators.pattern(/^[A-Za-z]{2}$/)]),
  });

  /**
   * Property formValue
   * @readonly
   *
   * @description
   * Current form value as a signal. Seeded with the raw value so the count is
   * right before the first edit — `valueChanges` alone would leave it empty.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<Record<string, unknown>>}
   */
  /**
   * Property legalTypeOptions
   * @readonly
   *
   * @description
   * Legal entity types accepted by the API, loaded from
   * `GET /api/organizations/legal-types` — the endpoint that exists for this
   * select and that the form ignored while offering a free text box.
   *
   * Falls back to an empty list on failure: the field then renders no choices
   * rather than a stale hard-coded copy that would drift from the backend.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<readonly OptionOutput[]>}
   */
  private readonly formValue: Signal<Record<string, unknown>> = toSignal(
    this.form.valueChanges as Observable<Record<string, unknown>>,
    { initialValue: this.form.getRawValue() as Record<string, unknown> },
  );

  /**
   * Property completeness
   * @readonly
   *
   * @description
   * How many legal fields carry a value. Every field is optional, so nothing
   * here is an error — but a half-filled legal profile blocks compliance
   * exports downstream. Rendered by the hosting page via
   * {@link OrganizationLegalForm#completenessChange}, not by this form.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<LegalFormCompleteness>}
   */
  private readonly completeness: Signal<LegalFormCompleteness> = computed(
    (): LegalFormCompleteness => {
      const values: readonly unknown[] = Object.values(this.formValue());

      return {
        filled: values.filter((value: unknown): boolean => String(value ?? '').trim() !== '')
          .length,
        total: values.length,
      };
    },
  );
  //#endregion

  //#region Lifecycle
  /**
   * Refills the form whenever the organization resolves or changes, and
   * forwards the current field-completeness count to the hosting page.
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

    effect((): void => {
      this.completenessChange.emit(this.completeness());
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
