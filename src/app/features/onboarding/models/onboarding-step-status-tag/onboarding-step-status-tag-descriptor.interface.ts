import type { OnboardingStepStatusTagSeverity } from './onboarding-step-status-tag-severity.type';

/**
 * Interface OnboardingStepStatusTagDescriptor
 *
 * @description
 * How one {@link OnboardingStepStatus} value looks, wherever the wizard rail
 * renders it. `label` and `icon` always render, so a step's status is legible
 * without its colour; `severity` only tints what the other two already say
 * (WCAG 1.4.1).
 *
 * @since 1.0.0
 */
export interface OnboardingStepStatusTagDescriptor {
  /** Localized human label. */
  readonly label: string;

  /** Presentation weight the render site maps to a tint. */
  readonly severity: OnboardingStepStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name, e.g. `lucideCircleCheck`. */
  readonly icon: string;
}
