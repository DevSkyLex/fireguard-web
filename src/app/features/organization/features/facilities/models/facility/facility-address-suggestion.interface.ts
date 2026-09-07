/**
 * Interface FacilityAddressSuggestion
 * @interface FacilityAddressSuggestion
 * @description Address value object returned by the facility suggestion provider, without a persisted resource identifier.
 * @since 1.0.0
 */
export interface FacilityAddressSuggestion {
  /**
   * Property displayName
   * @readonly
   * @description Provider-formatted postal address.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly displayName: string;

  /**
   * Property street
   * @readonly
   * @description Provider-supplied street and optional house number; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly street?: string;

  /**
   * Property city
   * @readonly
   * @description Provider-supplied locality; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly city?: string;

  /**
   * Property region
   * @readonly
   * @description Provider-supplied state or province when available; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly region?: string;

  /**
   * Property country
   * @readonly
   * @description Provider-supplied country name; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly country?: string;

  /**
   * Property countryCode
   * @readonly
   * @description ISO 3166-1 alpha-2 country code from the provider; absent on older responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly countryCode?: string;

  /**
   * Property postalCode
   * @readonly
   * @description Provider-supplied postal code when available; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly postalCode?: string;
  /**
   * Property latitude
   * @readonly
   * @description Decimal latitude.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly latitude: number;
  /**
   * Property longitude
   * @readonly
   * @description Decimal longitude.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly longitude: number;
}
