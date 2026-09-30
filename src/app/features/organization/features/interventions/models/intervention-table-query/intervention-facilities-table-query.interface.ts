import type {
  FacilityStatus,
  FacilityType,
} from '@features/organization/features/facilities/models';

/**
 * Interface InterventionFacilitiesTableQuery
 * @interface InterventionFacilitiesTableQuery
 *
 * @description
 * Controlled criteria for linked facilities, retained in page state.
 *
 * @since 6.2.0
 */
export interface InterventionFacilitiesTableQuery {
  /**
   * Property search
   * @readonly
   *
   * @description
   * Contains the text used to filter the linked-resource list.
   *
   * @access public
   *
   * @type {string}
   */
  readonly search: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Classifies this intervention facilities table for feature-specific handling.
   *
   * @access public
   *
   * @type {FacilityType | null}
   */
  readonly type: FacilityType | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this intervention facilities table.
   *
   * @access public
   *
   * @type {FacilityStatus | null}
   */
  readonly status: FacilityStatus | null;
}
