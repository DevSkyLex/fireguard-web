import type { EquipmentCriticality } from '@features/organization/features/equipments/models';

/**
 * Interface EquipmentCharacteristicsDraft
 * @interface EquipmentCharacteristicsDraft
 *
 * @description
 * Signal Form draft for declared impact and technical characteristics.
 */
export interface EquipmentCharacteristicsDraft {
  /**
   * Property criticality
   *
   * @description
   * Declared impact, or an empty value when it is unknown.
   */
  readonly criticality: EquipmentCriticality | '';

  /**
   * Property properties
   *
   * @description
   * Edited technical values; empty units remain ordinary text drafts.
   */
  readonly properties: readonly {
    readonly key: string;
    readonly value: string;
    readonly unit: string;
  }[];
}
