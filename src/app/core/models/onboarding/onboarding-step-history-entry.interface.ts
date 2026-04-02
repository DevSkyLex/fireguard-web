import type { OnboardingStepKey } from './onboarding-step-key.type';

/**
 * Interface OnboardingStepHistoryEntry
 * @interface OnboardingStepHistoryEntry
 *
 * @description
 * Historical entry describing when an onboarding
 * step was completed or skipped.
 */
export interface OnboardingStepHistoryEntry {
  //#region Properties
  /**
   * Property stepKey
   * @readonly
   *
   * @description
   * Key of the onboarding step referenced by the
   * history entry.
   *
   * @type {OnboardingStepKey}
   */
  readonly stepKey: OnboardingStepKey;

  /**
   * Property occurredAt
   * @readonly
   *
   * @description
   * Timestamp at which the history event occurred.
   *
   * @type {string}
   */
  readonly occurredAt: string;

  /**
   * Property skipped
   * @readonly
   *
   * @description
   * Whether the step was skipped instead of fully
   * completed.
   *
   * @type {boolean}
   */
  readonly skipped: boolean;
  //#endregion
}
