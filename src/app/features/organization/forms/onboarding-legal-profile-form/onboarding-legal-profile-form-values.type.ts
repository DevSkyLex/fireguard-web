import type { OrganizationLegalType } from '@core/models/organization';

/**
 * Type OnboardingLegalProfileFormValues
 * @type OnboardingLegalProfileFormValues
 *
 * @description
 * Submitted values from onboarding legal profile form.
 *
 * @version 1.0.0
 */
export type OnboardingLegalProfileFormValues = {
  readonly legalType: OrganizationLegalType;
  readonly legalName: string;
  readonly registrationNumber: string;
  readonly vatNumber: string;
};

