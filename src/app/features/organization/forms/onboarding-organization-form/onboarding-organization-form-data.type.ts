import type { FormControl } from '@angular/forms';
import type { OnboardingOrganizationFormValues } from './onboarding-organization-form-values.type';

/**
 * Type OnboardingOrganizationFormData
 * @type OnboardingOrganizationFormData
 *
 * @description
 * Reactive form data type for organization onboarding form.
 *
 * @version 1.0.0
 */
export type OnboardingOrganizationFormData = {
  [K in keyof OnboardingOrganizationFormValues]: FormControl<OnboardingOrganizationFormValues[K]>;
};
