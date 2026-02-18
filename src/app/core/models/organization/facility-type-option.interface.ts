import type { OrganizationFacilityType } from './organization-facility-type.type';

/**
 * Interface FacilityTypeOption
 * @interface FacilityTypeOption
 *
 * @description
 * Facility type option returned by:
 * `GET /api/facilities/types`.
 *
 * @version 1.0.0
 */
export interface FacilityTypeOption {
  /**
   * Property value
   * @readonly
   *
   * @description
   * Facility type technical value.
   *
   * @type {OrganizationFacilityType}
   */
  readonly value: OrganizationFacilityType;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable label.
   *
   * @type {string}
   */
  readonly label: string;
}

