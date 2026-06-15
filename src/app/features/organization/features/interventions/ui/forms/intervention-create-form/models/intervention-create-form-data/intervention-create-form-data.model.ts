import type { FormControl } from '@angular/forms';
import type { InterventionCreateFormValues } from '../intervention-create-form-values';

/** Typed controls backing the intervention creation form. */
export type InterventionCreateFormData = {
  [K in keyof InterventionCreateFormValues]: FormControl<InterventionCreateFormValues[K]>;
};
