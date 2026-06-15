import type { FormControl } from '@angular/forms';
import type { InterventionWorkItemFormValues } from '../intervention-work-item-form-values';

/** Typed controls backing the prepared work-item form. */
export type InterventionWorkItemFormData = {
  [K in keyof InterventionWorkItemFormValues]: FormControl<InterventionWorkItemFormValues[K]>;
};
