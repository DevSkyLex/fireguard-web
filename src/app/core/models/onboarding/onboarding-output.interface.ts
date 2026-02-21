import type { HydraItem } from '@core/models/api';
import type { OnboardingState } from './onboarding-state.type';
import type { OnboardingStepKey } from './onboarding-step-key.type';
import type { OnboardingStepOutput } from './onboarding-step-output.interface';
import type { OnboardingStepHistoryEntry } from './onboarding-step-history-entry.interface';

export interface OnboardingOutput extends HydraItem {
  readonly flow: string;
  readonly state: OnboardingState;
  readonly nextStep: OnboardingStepKey | null;
  readonly blockedReason: string | null;
  readonly completedSteps: readonly OnboardingStepKey[];
  readonly skippedSteps: readonly OnboardingStepKey[];
  readonly steps: readonly OnboardingStepOutput[];
  readonly stepHistory: readonly OnboardingStepHistoryEntry[];
  readonly targetOrganizationId: string | null;
  readonly targetOrganizationName: string | null;
  readonly canRollback: boolean;
  readonly lastRollbackableStep: OnboardingStepKey | null;
  readonly rollbackMethod: string | null;
  readonly rollbackPath: string | null;
  readonly updatedAt: string | null;
}
