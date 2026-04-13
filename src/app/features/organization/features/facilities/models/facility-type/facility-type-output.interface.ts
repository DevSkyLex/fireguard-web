import type { HydraItem } from '@core/models/api';

/**
 * Interface FacilityTypeOutput
 * @interface FacilityTypeOutput
 *
 * @description
 * Facility type option returned by the API for
 * selector or catalog use cases.
 */
export interface FacilityTypeOutput extends HydraItem {
  //#region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Internal value of the facility type.
   *
   * @type {string}
   */
  readonly value: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable label of the facility type.
   *
   * @type {string}
   */
  readonly label: string;
  //#endregion
}
