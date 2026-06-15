import type { FormControl } from '@angular/forms';
import type { InterventionPlanningFormValues } from '../intervention-planning-form-values';

/** Typed controls backing the intervention planning form. */
export type InterventionPlanningFormData = {
  [K in keyof InterventionPlanningFormValues]: FormControl<InterventionPlanningFormValues[K]>;
};
