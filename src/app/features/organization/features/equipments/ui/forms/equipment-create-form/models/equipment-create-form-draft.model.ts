import type { EquipmentType } from '@features/organization/features/equipments/models';

/**
 * Interface EquipmentCreateFormDraft
 * @interface EquipmentCreateFormDraft
 *
 * @description
 * The Signal Forms model this form actually edits. `type` starts blank so
 * the required rule has something to reject; every other field is free text
 * with no backend enum of its own.
 *
 * @since 1.0.0
 */
export interface EquipmentCreateFormDraft {
  /**
   * Property name
   *
   * @description
   * Optional human-readable equipment identity.
   */
  readonly name: string;

  /**
   * Property assetCode
   *
   * @description
   * Optional organization-unique inventory reference.
   */
  readonly assetCode: string;
  /**
   * Property type
   *
   * @description
   * Stable catalog code, empty until a type is selected.
   */
  readonly type: EquipmentType | '';

  /**
   * Property subType
   *
   * @description
   * Declared subtype refining the equipment type.
   */
  readonly subType: string;

  /**
   * Property brand
   *
   * @description
   * Manufacturer brand.
   */
  readonly brand: string;

  /**
   * Property model
   *
   * @description
   * Manufacturer model reference.
   */
  readonly model: string;

  /**
   * Property serialNumber
   *
   * @description
   * Manufacturer serial number identifying the equipment.
   */
  readonly serialNumber: string;

  /**
   * Property locationLabel
   *
   * @description
   * Human-readable location within the assigned site.
   */
  readonly locationLabel: string;

  /**
   * Property facility
   *
   * @description
   * Assigned site identity, empty when unassigned.
   */
  readonly facility: string;
}
