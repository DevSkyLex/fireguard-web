import type { CallState } from '@core/state/request-state';
import type { OnboardingOutput } from '@features/onboarding/models';

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

  /** Tracks the GET (load) call state. */
  readonly loadCallState: CallState<OnboardingOutput>;

  /** Tracks the POST (start) call state. */
  readonly startCallState: CallState<OnboardingOutput>;

  /** Tracks the execute-step mutation call state. */
  readonly executeStepCallState: CallState<OnboardingOutput>;

  /** Tracks the skip-step mutation call state. */
  readonly skipStepCallState: CallState<OnboardingOutput>;

  /** Tracks the rollback mutation call state. */
  readonly rollbackCallState: CallState<OnboardingOutput>;
}
//#endregion
