import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  disabled,
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  pattern,
  type FieldTree,
} from '@angular/forms/signals';
import type { OptionOutput } from '@core/api/models';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { OrganizationLegalFormValues } from './models';

/**
 * Constant UNSET_LEGAL_TYPE
 *
 * @description
 * The value standing in for "not set" in the legal-type select — a real catalog value is never an
 * empty string.
 */
const UNSET_LEGAL_TYPE = '';

/**
 * Constant LEGAL_NAME_MAX_LENGTH
 *
 * @description
 * Backend `Assert\Length` caps mirrored client-side so a reader sees the limit before the round
 * trip (`UpdateOrganizationSettingsInput`).
 */
const LEGAL_NAME_MAX_LENGTH = 255;

/**
 * Constant REGISTRATION_NUMBER_MAX_LENGTH
 *
 * @description
 * Mirrors the API validation limit so the form can reject an oversized registration number early.
 *
 * @access private
 * @since unreleased
 *
 * @type {number}
 */
const REGISTRATION_NUMBER_MAX_LENGTH = 64;

/**
 * Constant VAT_NUMBER_MAX_LENGTH
 *
 * @description
 * Mirrors the API validation limit for an organization's VAT number.
 *
 * @access private
 * @since unreleased
 *
 * @type {number}
 */
const VAT_NUMBER_MAX_LENGTH = 64;

/**
 * Constant COUNTRY_PATTERN
 *
 * @description
 * Backend `Assert\Regex` on `country`: exactly two letters (ISO 3166-1 alpha-2), or empty to clear.
 */
const COUNTRY_PATTERN: RegExp = /^[A-Za-z]{2}$/;

/**
 * Component OrganizationLegalForm
 * @class OrganizationLegalForm
 *
 * @description
 * The organization's optional legal profile — country, legal entity type,
 * registered legal name, registration number and VAT number — used on
 * reports, invoices and compliance documents. It owns its model and rules
 * and emits {@link submitted}; the page maps the values onto the settings
 * PATCH and calls the store (`ARCHITECTURE.md` §10.4).
 *
 * Scalar fields clear on empty strings, and an empty address clears on an empty object. There is no
 * `required` rule here: an organization with no legal profile yet is a
 * valid, common state. {@link legalTypeOptions} is fetched by the page —
 * a form never injects a service (§10.3) — so an empty array simply renders
 * the select with only the "Not set" choice while it loads.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <app-organization-legal-form
 *   [legal]="legalFormValues()"
 *   [legalTypeOptions]="legalTypeOptions()"
 *   [pending]="settingsStore.isSaving()"
 *   (submitted)="saveLegal($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-organization-legal-form',
  imports: [FormField, FormRoot, HlmButton, HlmInput, ...HlmFieldImports, ...HlmSelectImports],
  templateUrl: './organization-legal-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLegalForm {
  //#region Inputs
  /**
   * Property legal
   * @readonly
   *
   * @description
   * Saved values read at initial creation, organization change or explicit successful-save reset.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationLegalFormValues>}
   */
  public readonly legal: InputSignal<OrganizationLegalFormValues> =
    input.required<OrganizationLegalFormValues>();

  /**
   * Property legalTypeOptions
   * @readonly
   *
   * @description
   * The legal entity type catalog (`GET /organizations/legal-types`), fetched by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<OptionOutput>>}
   */
  public readonly legalTypeOptions: InputSignal<ReadonlyArray<OptionOutput>> = input<
    ReadonlyArray<OptionOutput>
  >([]);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is in flight, which disables the submit control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Draft ownership; changing organizations resets all fields.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input('');

  /**
   * Property resetRevision
   * @readonly
   *
   * @description
   * Incremented by the page only after this draft's save succeeds.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly resetRevision: InputSignal<number> = input(0);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the edited values once the form is valid and has changed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OrganizationLegalFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationLegalFormValues> =
    output<OrganizationLegalFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property unsetLegalType
   * @readonly
   *
   * @description
   * The value standing in for "not set" — projected for the template's root option.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly unsetLegalType: string = UNSET_LEGAL_TYPE;

  /**
   * Property unsetLegalTypeLabel
   * @readonly
   *
   * @description
   * The localized label standing for "not set" in the legal-type select.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly unsetLegalTypeLabel: string = $localize`:@@org.settings.legal.typeUnset:Not set`;

  /**
   * Property legalTypeLabel
   * @readonly
   *
   * @description
   * Renders the selected legal type in the closed trigger, including the unset option.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(value: string) => string}
   */
  protected readonly legalTypeLabel = (value: string): string =>
    value === UNSET_LEGAL_TYPE
      ? this.unsetLegalTypeLabel
      : (this.legalTypeOptions().find((option) => option.value === value)?.label ??
        $localize`:@@common.unknownType:Unknown type`);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Local draft kept independently of unrelated server refreshes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationLegalFormValues>}
   */
  protected readonly model: WritableSignal<OrganizationLegalFormValues> = signal({
    country: '',
    legalType: '',
    legalName: '',
    registrationNumber: '',
    vatNumber: '',
    registeredAddress: {
      line1: '',
      line2: '',
      postalCode: '',
      city: '',
      region: '',
      countryCode: '',
    },
    privacyContactEmail: '',
  });

  /**
   * Property legalForm
   * @readonly
   *
   * @description
   * The field tree and its rules. No field is required — an organization with no legal profile is
   * valid — only the backend DTO's own constraints: length limits, email format and two-letter
   * country syntax. The API validates supported ISO codes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OrganizationLegalFormValues>}
   */
  protected readonly legalForm: FieldTree<OrganizationLegalFormValues> = form(
    this.model,
    (path): void => {
      disabled(path, { when: () => this.pending() });
      pattern(path.country, COUNTRY_PATTERN, {
        message: $localize`:@@org.settings.legal.countryTooLong:Use the 2-letter country code`,
      });
      maxLength(path.legalName, LEGAL_NAME_MAX_LENGTH, {
        message: $localize`:@@org.settings.legal.legalNameTooLong:This name is too long`,
      });
      maxLength(path.registrationNumber, REGISTRATION_NUMBER_MAX_LENGTH, {
        message: $localize`:@@org.settings.legal.registrationNumberTooLong:This number is too long`,
      });
      maxLength(path.vatNumber, VAT_NUMBER_MAX_LENGTH, {
        message: $localize`:@@org.settings.legal.vatNumberTooLong:This number is too long`,
      });
      maxLength(path.registeredAddress.line1, 255, {
        message: $localize`:@@org.settings.legal.addressTooLong:This address field is too long`,
      });
      maxLength(path.registeredAddress.line2, 255, {
        message: $localize`:@@org.settings.legal.addressTooLong:This address field is too long`,
      });
      maxLength(path.registeredAddress.city, 128, {
        message: $localize`:@@org.settings.legal.addressTooLong:This address field is too long`,
      });
      maxLength(path.registeredAddress.region, 128, {
        message: $localize`:@@org.settings.legal.addressTooLong:This address field is too long`,
      });
      maxLength(path.registeredAddress.postalCode, 32, {
        message: $localize`:@@org.settings.legal.addressTooLong:This address field is too long`,
      });
      pattern(path.registeredAddress.countryCode, COUNTRY_PATTERN, {
        message: $localize`:@@org.settings.legal.countryTooLong:Use the 2-letter country code`,
      });
      email(path.privacyContactEmail, {
        message: $localize`:@@org.settings.legal.privacyEmailInvalid:Enter a valid email address`,
      });
      maxLength(path.privacyContactEmail, 254, {
        message: $localize`:@@org.settings.legal.privacyEmailTooLong:This email address is too long`,
      });
    },
  );

  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Whether the submit control should be enabled: the tree is valid, has changed from the seeded
   * values, and no save is already in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => this.legalForm().valid() && this.legalForm().dirty() && !this.pending(),
  );

  /**
   * Property missingDocumentIdentity
   * @readonly
   *
   * @description
   * Nonblocking guidance for the identifying information used in documents.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly missingDocumentIdentity: Signal<boolean> = computed(
    () =>
      !this.model().legalName.trim() ||
      !Object.values(this.model().registeredAddress).some((value) => value.trim().length > 0),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Refreshes intact forms from server values. Modified drafts reset only on owner change or a
   * successful-save acknowledgement.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    let seededOrganizationId: string | undefined;
    let acknowledgedRevision: number | undefined;

    effect(() => {
      const organizationId = this.organizationId();
      const resetRevision = this.resetRevision();
      const legal = this.legal();
      const pending = this.pending();
      const resetDraft =
        organizationId !== seededOrganizationId || resetRevision !== acknowledgedRevision;

      untracked(() => {
        // Disabled fields temporarily disappear from aggregate dirtiness during a save.
        if (resetDraft || (!pending && !this.legalForm().dirty())) {
          this.legalForm().reset({
            ...legal,
            registeredAddress: { ...legal.registeredAddress },
          });
        }
      });

      seededOrganizationId = organizationId;
      acknowledgedRevision = resetRevision;
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the form touched so every failing rule becomes visible, then emits
   * only if it is valid and changed.
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

    this.legalForm().markAsTouched();

    if (!this.canSubmit()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
