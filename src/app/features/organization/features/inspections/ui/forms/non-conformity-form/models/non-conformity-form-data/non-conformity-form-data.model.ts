import type { FormControl } from '@angular/forms';
import type { NonConformityFormValues } from '../non-conformity-form-values';

/** Typed controls backing the non-conformity form. */
export type NonConformityFormData = {
  [K in keyof NonConformityFormValues]: FormControl<NonConformityFormValues[K]>;
};
