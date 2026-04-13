import type { FormControl } from '@angular/forms';
import type { CreateFacilityFormValues } from './create-facility-form-values.type';

/**
 * Type CreateFacilityFormData
 *
 * @description
 * Typed FormGroup shape for the create-facility onboarding form.
 *
 * @since 1.0.0
 */
export type CreateFacilityFormData = {
  [K in keyof CreateFacilityFormValues]: FormControl<CreateFacilityFormValues[K]>;
};
