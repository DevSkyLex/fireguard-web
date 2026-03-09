import type { FormControl } from '@angular/forms';
import type { InspectionFormValues } from './inspection-form-values.type';

/**
 * Type InspectionFormData
 *
 * @description
 * Typed FormGroup shape for the inspection form.
 *
 * @since 1.0.0
 */
export type InspectionFormData = {
  [K in keyof InspectionFormValues]: FormControl<InspectionFormValues[K]>;
};
