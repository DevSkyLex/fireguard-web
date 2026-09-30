import type { FacilityType } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityCreateFormDraft
 * @interface
 *
 * @description
 * The create form's own field shape: every value a plain string (or the
 * empty string standing in for "not chosen yet") so Signal Forms has
 * something to bind, converted to `CreateFacilityInput` on submit.
 *
 * @since 1.0.0
 */
export interface FacilityCreateFormDraft {
  /**
   * Property type
   * @readonly
   *
   * @description
   * Classifies this facility create form for feature-specific handling.
   *
   * @access public
   *
   * @type {FacilityType | ''}
   */
  readonly type: FacilityType | '';

  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this facility create form.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property parentFacilityId
   * @readonly
   *
   * @description
   * Identifies the parent facility associated with this facility create form.
   *
   * @access public
   *
   * @type {string}
   */
  readonly parentFacilityId: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Carries the optional reference code for the linked resource.
   *
   * @access public
   *
   * @type {string}
   */
  readonly code: string;

  /**
   * Property address
   * @readonly
   *
   * @description
   * Provides the facility street address.
   *
   * @access public
   *
   * @type {string}
   */
  readonly address: string;

  /**
   * Property latitude
   * @readonly
   *
   * @description
   * Provides the facility latitude coordinate.
   *
   * @access public
   *
   * @type {string}
   */
  readonly latitude: string;

  /**
   * Property longitude
   * @readonly
   *
   * @description
   * Provides the facility longitude coordinate.
   *
   * @access public
   *
   * @type {string}
   */
  readonly longitude: string;

  /**
   * Property levelIndex
   * @readonly
   *
   * @description
   * Provides the building level identifier used by the floor selector.
   *
   * @access public
   *
   * @type {string}
   */
  readonly levelIndex: string;
}
