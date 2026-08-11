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
  /** The equipment type, or an empty string until one is picked. */
  readonly type: EquipmentType | '';

  /** Free-text subtype refining the main type. */
  readonly subType: string;

  /** Manufacturer brand. */
  readonly brand: string;

  /** Model reference. */
  readonly model: string;

  /** Manufacturer serial number. */
  readonly serialNumber: string;

  /** Human-readable location inside the facility. */
  readonly locationLabel: string;
}
