/**
 * Interface OrganizationRegisteredAddress
 * @interface OrganizationRegisteredAddress
 *
 * @description
 * Optional registered-office address. PATCH replaces the full object; an empty object clears it.
 */
export interface OrganizationRegisteredAddress {
  /**
   * Property line1
   *
   * @description
   * First address line.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly line1?: string | null;

  /**
   * Property line2
   *
   * @description
   * Additional address line.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly line2?: string | null;

  /**
   * Property postalCode
   *
   * @description
   * Postal code without national format restrictions.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly postalCode?: string | null;

  /**
   * Property city
   *
   * @description
   * Registered-office locality.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly city?: string | null;

  /**
   * Property region
   *
   * @description
   * Optional administrative region.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly region?: string | null;

  /**
   * Property countryCode
   *
   * @description
   * ISO 3166-1 alpha-2 country code, validated by the API.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly countryCode?: string | null;
}
