import type { FormControl } from '@angular/forms';
import type { InterventionDiscoveryFormValues } from '../intervention-discovery-form-values';

/** Typed controls backing the field discovery form. */
export type InterventionDiscoveryFormData = {
  [K in keyof InterventionDiscoveryFormValues]: FormControl<InterventionDiscoveryFormValues[K]>;
};
