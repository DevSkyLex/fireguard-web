import type { EquipmentFamily } from './equipment-type-output.interface';

/**
 * Interface UpdateEquipmentTypeInput
 * @interface UpdateEquipmentTypeInput
 *
 * @description
 * Revision-checked catalogue update; permanent codes cannot be patched.
 */
export interface UpdateEquipmentTypeInput {
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Revision reviewed by the operator before saving.
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Optional replacement label.
   *
   * @type {string | undefined}
   */
  readonly label?: string;

  /**
   * Property family
   * @readonly
   *
   * @description
   * Optional replacement inventory family.
   *
   * @type {EquipmentFamily | undefined}
   */
  readonly family?: EquipmentFamily;

  /**
   * Property archived
   * @readonly
   *
   * @description
   * Archived entries remain readable and can be explicitly restored.
   *
   * @type {boolean | undefined}
   */
  readonly archived?: boolean;
}
