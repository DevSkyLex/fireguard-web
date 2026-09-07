import type { SetupFacilityType } from '@features/organization/setup';

/**
 * Interface OnboardingFacilityDraft
 * @interface OnboardingFacilityDraft
 *
 * @description
 * The Signal Forms model for the single facility row currently being edited
 * before it is staged into the list the step ultimately submits.
 *
 * @since 1.0.0
 */
export interface OnboardingFacilityDraft {
  /** The facility type, or an empty string until one is picked. */
  readonly type: SetupFacilityType | '';

  /** Display name of the facility. */
  readonly name: string;

  /** Typed address, valid only after selecting a provider suggestion. */
  readonly address: string;
  /**
   * Property city
   * @readonly
   * @description Locality used to refine and confirm the address.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly city: string;

  /**
   * Property country
   * @readonly
   * @description Country name when provided by the address source.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly country: string;

  /**
   * Property postalCode
   * @readonly
   * @description Postal code when available for the locality.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly postalCode: string;
}
