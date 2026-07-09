import type { FormControl } from '@angular/forms';
import type { InterventionRequestChangesFormValues } from '../intervention-request-changes-form-values';

/** Typed controls backing the request-changes form. */
export type InterventionRequestChangesFormData = {
  [K in keyof InterventionRequestChangesFormValues]: FormControl<
    InterventionRequestChangesFormValues[K]
  >;
};
