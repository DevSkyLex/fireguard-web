import type { OnboardingStepKey } from './onboarding-step-key.type';

export interface OnboardingStepHistoryEntry {
  readonly stepKey: OnboardingStepKey;
  readonly occurredAt: string;
  readonly skipped: boolean;
}
