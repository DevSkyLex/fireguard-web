import type { EquipmentStatus } from '@features/organization/features/equipments/models';

/**
 * Interface EquipmentStatusOption
 *
 * @description
 * Option rendered by the facility equipment status filter.
 *
 * @since 1.0.0
 */
export interface EquipmentStatusOption {
  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable label displayed in the status dropdown.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Equipment status value forwarded to the equipment API.
   *
   * @type {EquipmentStatus}
   */
  readonly value: EquipmentStatus;
}
