/**
 * Interface OrganizationLegalFormValues
 *
 * @description
 * The shape the legal information form edits. Every field is a plain
 * string — an empty one is what clears the field on the settings `PATCH`
 * (`UpdateOrganizationInput`), unlike `OrganizationGeneralFormValues.description`
 * which clears on `null` (`ARCHITECTURE.md` §10.4).
 *
 * @since 1.0.0
 */
export interface OrganizationLegalFormValues {
  country: string;
  legalType: string;
  legalName: string;
  registrationNumber: string;
  vatNumber: string;
}
