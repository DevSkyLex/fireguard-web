import type { FacilityType } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityTypeOption
 * @interface FacilityTypeOption
 *
 * @description
 * Display metadata used to render the "Type" column filter select. Facility
 * types have no dedicated severity/colour registry today, so this option
 * only carries the PrimeIcon already used for the type avatar (see
 * {@link FacilityTypeIconMap}) alongside a title-cased label and the API
 * `value` sent in list filters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityTypeOption {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable, title-cased facility type label.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Facility type value sent by the API.
   *
   * @type {FacilityType}
   */
  readonly value: FacilityType;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcon class matching the facility type avatar.
   *
   * @type {string}
   */
  readonly icon: string;
  //#endregion
}
