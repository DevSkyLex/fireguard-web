/**
 * Interface FacilityEquipmentStatusRow
 * @interface FacilityEquipmentStatusRow
 *
 * @description
 * View model describing a single equipment-status progress row in the
 * facility overview. Aggregates the count of equipment in a given status
 * along with the relative ratio used to render a progress bar.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityEquipmentStatusRow {
  //#region Properties
  /**
   * Property label
   *
   * @description
   * Human-readable status label (e.g. "Commissioned").
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property count
   *
   * @description
   * Number of equipment items currently in this status.
   *
   * @type {number}
   */
  readonly count: number;

  /**
   * Property total
   *
   * @description
   * Total number of equipment items assigned to the facility.
   *
   * @type {number}
   */
  readonly total: number;

  /**
   * Property ratio
   *
   * @description
   * Fraction of the total represented by this status, in the `[0, 1]`
   * range. Used to compute the progress-bar width.
   *
   * @type {number}
   */
  readonly ratio: number;

  /**
   * Property colorClass
   *
   * @description
   * Tailwind background color token used for the progress-bar fill.
   *
   * @type {string}
   */
  readonly colorClass: string;
  //#endregion
}
