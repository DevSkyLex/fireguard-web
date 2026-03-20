import type { FormControl } from '@angular/forms';
import type { CreateEquipmentFormValues } from './create-equipment-form-values.type';

/**
 * Type CreateEquipmentFormData
 *
 * @description
 * Typed FormGroup shape for the create-equipment onboarding form.
 *
 * @since 1.0.0
 */
export type CreateEquipmentFormData = {
  [K in keyof CreateEquipmentFormValues]: FormControl<CreateEquipmentFormValues[K]>;
};
