import type { EquipmentStatus } from '@features/organization/features/equipments/models';

/**
 * Interface EquipmentStatusOption
 * @interface EquipmentStatusOption
 *
 * @description
 * Visual configuration used to render and filter equipment lifecycle status
 * values consistently across table badges and filter options.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface EquipmentStatusOption {
  //#region Properties
  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable status label displayed in the UI.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * API status value forwarded in list filters.
   *
   * @type {EquipmentStatus}
   */
  readonly value: EquipmentStatus;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcon class rendered next to the status label.
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
