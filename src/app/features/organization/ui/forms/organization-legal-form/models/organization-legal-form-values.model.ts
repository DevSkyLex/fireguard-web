/**
 * Interface OrganizationLegalFormValues
 * @interface OrganizationLegalFormValues
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
  /**
   * Property country
   *
   * @description
   * Holds the jurisdiction value used by the organization's legal profile.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  country: string;

  /**
   * Property legalType
   *
   * @description
   * Holds the selected legal-entity category.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  legalType: string;

  /**
   * Property legalName
   *
   * @description
   * Holds the registered name associated with the organization's legal entity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  legalName: string;

  /**
   * Property registrationNumber
   *
   * @description
   * Holds the entity's registration identifier for the selected jurisdiction.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  registrationNumber: string;

  /**
   * Property vatNumber
   *
   * @description
   * Holds the organization's VAT identifier when it has one.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  vatNumber: string;
}
