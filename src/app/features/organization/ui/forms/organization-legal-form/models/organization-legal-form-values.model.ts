/**
 * Interface OrganizationLegalFormValues
 * @interface OrganizationLegalFormValues
 *
 * @description
 * Legal-profile draft. Scalar fields clear on empty strings; the page maps an entirely empty
 * registered address onto the API's empty-object clearing convention.
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

  /**
   * Property registeredAddress
   *
   * @description
   * Independently optional address components, kept as strings for field binding.
   *
   * @access public
   *
   * @type {{
   *   line1: string;
   *   line2: string;
   *   postalCode: string;
   *   city: string;
   *   region: string;
   *   countryCode: string;
   * }}
   */
  registeredAddress: {
    line1: string;
    line2: string;
    postalCode: string;
    city: string;
    region: string;
    countryCode: string;
  };

  /**
   * Property privacyContactEmail
   *
   * @description
   * Optional contact for the organization's personal-data processing.
   *
   * @access public
   *
   * @type {string}
   */
  privacyContactEmail: string;
}
