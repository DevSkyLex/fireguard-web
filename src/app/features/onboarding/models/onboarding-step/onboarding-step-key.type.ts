import type { OnboardingStepOutput } from './onboarding-step-output.interface';

/**
 * Type OnboardingStepKey
 *
 * @description
 * Backend-owned identifier for a contributed or historical onboarding step.
 * Derived from the step transport; presentation support does not determine identifier validity.
 *
 * @type {string}
 */
export type OnboardingStepKey = OnboardingStepOutput['key'];
