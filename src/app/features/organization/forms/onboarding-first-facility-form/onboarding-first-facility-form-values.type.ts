import type { OrganizationFacilityType } from '@core/models/organization';

/**
 * Type OnboardingFirstFacilityFormValues
 * @type OnboardingFirstFacilityFormValues
 *
 * @description
 * Submitted values from onboarding first facility form.
 *
 * @version 1.0.0
 */
export type OnboardingFirstFacilityFormValues = {
  readonly type: OrganizationFacilityType;
  readonly name: string;
  readonly code: string;
  readonly address: string;
  readonly country: string;
  readonly timezone: string;
};
