import type { OnboardingOutput } from '@core/models/onboarding';
import type { Operation } from '@core/stores/operations';

//#region Onboarding Store State
/**
 * Interface OnboardingStoreState
 * @interface OnboardingStoreState
 *
 * @description
 * Describes the state slice managed by the `OnboardingStore`.
 * The store tracks a single onboarding workflow together with
 * individual operation states for each API action. Provided at root
 * because the onboarding workflow spans the entire application.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OnboardingStoreState {
  /** The current onboarding record, or `null` before it has been fetched. */
  readonly onboarding: OnboardingOutput | null;

  /** Tracks the GET (load) operation lifecycle. */
  readonly loadOperation: Operation<OnboardingOutput, unknown>;

  /** Tracks the POST (start) operation lifecycle. */
  readonly startOperation: Operation<OnboardingOutput, unknown>;

  /** Tracks the execute-step mutation lifecycle. */
  readonly executeStepOperation: Operation<OnboardingOutput, unknown>;

  /** Tracks the skip-step mutation lifecycle. */
  readonly skipStepOperation: Operation<OnboardingOutput, unknown>;

  /** Tracks the rollback mutation lifecycle. */
  readonly rollbackOperation: Operation<OnboardingOutput, unknown>;
}
//#endregion
