import type { FormControl } from '@angular/forms';
import type { InterventionSkipFormValues } from '../intervention-skip-form-values';

/** Typed controls backing the work-item skip form. */
export type InterventionSkipFormData = {
  [K in keyof InterventionSkipFormValues]: FormControl<InterventionSkipFormValues[K]>;
};
