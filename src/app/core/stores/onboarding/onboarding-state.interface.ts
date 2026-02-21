import type { OnboardingOutput } from '@core/models/onboarding';
import type { Operation } from '@core/stores/operations';

export interface OnboardingStoreState {
  readonly onboarding: OnboardingOutput | null;
  readonly loadOperation: Operation<OnboardingOutput, unknown>;
  readonly startOperation: Operation<OnboardingOutput, unknown>;
  readonly executeStepOperation: Operation<OnboardingOutput, unknown>;
  readonly skipStepOperation: Operation<OnboardingOutput, unknown>;
  readonly rollbackOperation: Operation<OnboardingOutput, unknown>;
}
