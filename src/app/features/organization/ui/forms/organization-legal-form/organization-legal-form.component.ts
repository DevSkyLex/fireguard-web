import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, maxLength, pattern, type FieldTree } from '@angular/forms/signals';
import type { OptionOutput } from '@core/api/models';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { OrganizationLegalFormValues } from './models';

/** The value standing in for "not set" in the legal-type select — a real catalog value is never an empty string. */
const UNSET_LEGAL_TYPE = '';

/** Backend `Assert\Length` caps mirrored client-side so a reader sees the limit before the round trip (`UpdateOrganizationSettingsInput`). */
const LEGAL_NAME_MAX_LENGTH = 255;
const REGISTRATION_NUMBER_MAX_LENGTH = 64;
const VAT_NUMBER_MAX_LENGTH = 64;

/** Backend `Assert\Regex` on `country`: exactly two letters (ISO 3166-1 alpha-2), or empty to clear. */
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
 * Every field clears on submitting an empty string, so there is no
 * `required` rule here: an organization with no legal profile yet is a
 * valid, common state. {@link legalTypeOptions} is fetched by the page —
 * a form never injects a service (§10.3) — so an empty array simply renders
 * the select with only the "Not set" choice while it loads.
 *
 * @version 1.0.0
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
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-legal-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmSelectImports],
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
   * The values the form starts from, and re-seeds to whenever they change.
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
   * @description The legal entity type catalog (`GET /organizations/legal-types`), fetched by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<OptionOutput>>}
   */
  public readonly legalTypeOptions: InputSignal<ReadonlyArray<OptionOutput>> = input<
    ReadonlyArray<OptionOutput>
  >([]);

  /**
   * Property pending
   * @readonly
   * @description Whether a save is in flight, which disables the submit control.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the edited values once the form is valid and has changed.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationLegalFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationLegalFormValues> =
    output<OrganizationLegalFormValues>();
  //#endregion

  //#region Properties
  /** The value standing in for "not set" — projected for the template's root option. */
  protected readonly unsetLegalType: string = UNSET_LEGAL_TYPE;

  /** The localized label standing for "not set" in the legal-type select. */
  protected readonly unsetLegalTypeLabel: string = $localize`:@@org.settings.legal.typeUnset:Not set`;

  /**
   * Property legalTypeLabel
   * @readonly
   * @description Renders the selected legal type in the closed trigger, including the unset option.
   * @access protected
   * @since 1.0.0
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
   * @description The edited values, re-seeded from {@link legal} whenever it changes.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<OrganizationLegalFormValues>}
   */
  protected readonly model: WritableSignal<OrganizationLegalFormValues> = linkedSignal(
    (): OrganizationLegalFormValues => ({ ...this.legal() }),
  );

  /**
   * Property legalForm
   * @readonly
   *
   * @description
   * The field tree and its rules. No field is required — an organization
   * with no legal profile is valid — only the backend DTO's own constraints:
   * length caps on the three free-text fields, and the exact two-letter
   * `Assert\Regex` on `country` (an empty value clears and skips the rule).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OrganizationLegalFormValues>}
   */
  protected readonly legalForm: FieldTree<OrganizationLegalFormValues> = form(
    this.model,
    (path): void => {
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
    },
  );

  /**
   * Property canSubmit
   * @readonly
   * @description Whether the submit control should be enabled: the tree is valid, has changed from the seeded values, and no save is already in flight.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => this.legalForm().valid() && this.legalForm().dirty() && !this.pending(),
  );
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
