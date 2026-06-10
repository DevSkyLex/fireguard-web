import type { FormControl } from '@angular/forms';
import type { CreateInspectionFormValues } from '../create-inspection-form-values';

/**
 * Type CreateInspectionFormData
 *
 * @description
 * Typed FormGroup shape for the create-inspection onboarding form.
 *
 * @since 1.0.0
 */
export type CreateInspectionFormData = {
  [K in keyof CreateInspectionFormValues]: FormControl<CreateInspectionFormValues[K]>;
};
