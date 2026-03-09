/**
 * Type EquipmentFormValues
 *
 * @description
 * Shape emitted by the equipment form on submit.
 * Maps to {@link CreateEquipmentInput} for creation.
 *
 * @since 1.0.0
 */
export interface EquipmentFormValues {
  readonly type: string;
  readonly subType: string;
  readonly brand: string;
  readonly model: string;
  readonly serialNumber: string;
  readonly locationLabel: string;
}
