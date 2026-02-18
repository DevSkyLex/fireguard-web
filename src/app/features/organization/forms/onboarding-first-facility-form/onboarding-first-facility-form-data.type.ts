import type { FormControl } from '@angular/forms';
import type { OnboardingFirstFacilityFormValues } from './onboarding-first-facility-form-values.type';

/**
 * Type OnboardingFirstFacilityFormData
 * @type OnboardingFirstFacilityFormData
 *
 * @description
 * Reactive form data type for first facility onboarding form.
 *
 * @version 1.0.0
 */
export type OnboardingFirstFacilityFormData = {
  [K in keyof OnboardingFirstFacilityFormValues]: FormControl<OnboardingFirstFacilityFormValues[K]>;
};
