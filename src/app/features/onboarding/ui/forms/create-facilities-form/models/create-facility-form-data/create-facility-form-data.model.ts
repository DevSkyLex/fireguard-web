import type { FormControl } from '@angular/forms';
import type { CreateFacilityFormValues } from '../create-facility-form-values';

/**
 * Type CreateFacilityFormData
 *
 * @description
 * Typed FormGroup shape of a single facility row in the create-facilities
 * onboarding form.
 *
 * @since 1.0.0
 */
export type CreateFacilityFormData = {
  [K in keyof CreateFacilityFormValues]: FormControl<CreateFacilityFormValues[K]>;
};
