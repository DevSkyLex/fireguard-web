import type { FormControl } from '@angular/forms';
import type { FacilityFormValues } from '../facility-form-values';

/**
 * Type FacilityFormData
 *
 * @description
 * Typed FormGroup shape for the facility form.
 *
 * @since 1.0.0
 */
export type FacilityFormData = {
  [K in keyof FacilityFormValues]: FormControl<FacilityFormValues[K]>;
};
