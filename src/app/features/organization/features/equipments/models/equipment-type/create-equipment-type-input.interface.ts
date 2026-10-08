import type { EquipmentFamily } from './equipment-type-output.interface';

/**
 * Interface CreateEquipmentTypeInput
 * @interface CreateEquipmentTypeInput
 *
 * @description
 * Creates one organization-owned equipment type with a permanent code.
 */
export interface CreateEquipmentTypeInput {
  /**
   * Property value
   * @readonly
   *
   * @description
   * Permanent lowercase catalogue code, limited to 32 characters.
   *
   * @type {string}
   */
  readonly value: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Organization display label, limited to 100 characters.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property family
   * @readonly
   *
   * @description
   * Family used to scope the equipment inventory.
   *
   * @type {EquipmentFamily}
   */
  readonly family: EquipmentFamily;
}
