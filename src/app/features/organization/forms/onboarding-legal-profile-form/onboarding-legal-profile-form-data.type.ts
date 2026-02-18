import type { FormControl } from '@angular/forms';
import type { OnboardingLegalProfileFormValues } from './onboarding-legal-profile-form-values.type';

/**
 * Type OnboardingLegalProfileFormData
 * @type OnboardingLegalProfileFormData
 *
 * @description
 * Reactive form data type for legal profile onboarding form.
 *
 * @version 1.0.0
 */
export type OnboardingLegalProfileFormData = {
  [K in keyof OnboardingLegalProfileFormValues]: FormControl<OnboardingLegalProfileFormValues[K]>;
};
