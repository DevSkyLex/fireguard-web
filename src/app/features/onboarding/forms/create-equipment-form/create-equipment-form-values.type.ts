/**
 * Interface CreateEquipmentFormValues
 *
 * @description
 * Shape emitted by the create-equipment onboarding form on submit.
 *
 * @since 1.0.0
 */
export interface CreateEquipmentFormValues {
  readonly type: string;
  readonly brand: string | null;
  readonly model: string | null;
  readonly serialNumber: string | null;
}
