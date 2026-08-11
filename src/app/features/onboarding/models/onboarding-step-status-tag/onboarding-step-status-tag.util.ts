import type { OnboardingStepStatus } from '../onboarding-step/onboarding-step-status.type';
import type { OnboardingStepStatusTagDescriptor } from './onboarding-step-status-tag-descriptor.interface';

/**
 * Descriptors for `OnboardingStepOutput.status`. Only the two-ends rule's
 * terminal states carry colour — `completed` success, `blocked` danger.
 * `pending` and `skipped` are both non-terminal, so they stay neutral; the
 * wizard rail distinguishes the active `pending` step from a future one by
 * position and weight, never by a third colour (`DESIGN.md` "The Two Ends
 * Rule").
 */
const STATUS: Record<OnboardingStepStatus, OnboardingStepStatusTagDescriptor> = {
  pending: {
    label: $localize`:@@onboarding.stepStatus.pending:Not started`,
    severity: 'neutral',
    icon: 'lucideCircleDashed',
  },
  completed: {
    label: $localize`:@@onboarding.stepStatus.completed:Completed`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  skipped: {
    label: $localize`:@@onboarding.stepStatus.skipped:Skipped`,
    severity: 'neutral',
    icon: 'lucideChevronsRight',
  },
  blocked: {
    label: $localize`:@@onboarding.stepStatus.blocked:Blocked`,
    severity: 'danger',
    icon: 'lucideCircleAlert',
  },
};

/**
 * Function resolveOnboardingStepStatusTag
 *
 * @description
 * Resolves the presentation descriptor for an onboarding step status value.
 * Falls back to a neutral, humanised descriptor for an unknown value so the
 * UI degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw status value.
 *
 * @returns {OnboardingStepStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveOnboardingStepStatusTag(value: string): OnboardingStepStatusTagDescriptor {
  return (
    STATUS[value as OnboardingStepStatus] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideCircle',
    }
  );
}
