import type { FormControl } from '@angular/forms';
import type { EquipmentFormValues } from '../equipment-form-values';

/**
 * Type EquipmentFormData
 *
 * @description
 * Typed FormGroup shape for the equipment form.
 *
 * @since 1.0.0
 */
export type EquipmentFormData = {
  [K in keyof EquipmentFormValues]: FormControl<EquipmentFormValues[K]>;
};
