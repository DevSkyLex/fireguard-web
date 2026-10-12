import { ONBOARDING_STEP_PRESENTATION } from '@features/onboarding/constants';
import type { OnboardingStepOutput, OnboardingStepPresentation } from '@features/onboarding/models';

/**
 * Function resolveOnboardingStepPresentation
 *
 * @description
 * Preserves FireGuard's localized presentation and names unfamiliar steps with their server label.
 * A missing renderer never implies permission to execute an unfamiliar workflow.
 *
 * @access public
 *
 * @param {OnboardingStepOutput} step - The contributed or historical step to display.
 *
 * @returns {OnboardingStepPresentation} Escaped text and a registered neutral icon.
 */
export function resolveOnboardingStepPresentation(
  step: OnboardingStepOutput,
): OnboardingStepPresentation {
  const known = Object.hasOwn(ONBOARDING_STEP_PRESENTATION, step.key)
    ? ONBOARDING_STEP_PRESENTATION[step.key]
    : undefined;
  if (known !== undefined) return known;

  return {
    icon: 'lucideCircle',
    label: step.label.trim() || step.key,
    sublabel: $localize`:@@onboarding.step.additional.sublabel:Additional step`,
    description: $localize`:@@onboarding.step.additional.description:This step needs a workflow that is not available in this application.`,
  };
}
