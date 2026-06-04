import type { FacilityStatus } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityStatusOption
 * @interface FacilityStatusOption
 *
 * @description
 * Display metadata used to render facility status badges consistently in the
 * facility table and its filters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityStatusOption {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable label shown in the UI.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Facility status value sent by the API.
   *
   * @type {FacilityStatus}
   */
  readonly value: FacilityStatus;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcon class displayed in the badge.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Accent color applied to the status icon.
   *
   * @type {string}
   */
  readonly color: string;
  //#endregion
}
