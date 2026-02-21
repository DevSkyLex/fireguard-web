import type { OnboardingStepKey } from './onboarding-step-key.type';
import type { OnboardingStepStatus } from './onboarding-step-status.type';

export interface OnboardingStepOutput {
  readonly key: OnboardingStepKey;
  readonly label: string;
  readonly status: OnboardingStepStatus;
  readonly required: boolean;
  readonly available: boolean;
  readonly reason: string | null;
  readonly actionMethod: string | null;
  readonly actionPath: string | null;
  readonly rollbackAvailable: boolean;
  readonly rollbackMethod: string | null;
  readonly rollbackPath: string | null;
  readonly skippable: boolean;
  readonly skipAvailable: boolean;
  readonly skipMethod: string | null;
  readonly skipPath: string | null;
  readonly completedAt: string | null;
}
