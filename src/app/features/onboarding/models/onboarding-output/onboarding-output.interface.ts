import type { HydraItem } from '@core/models/api';
import type { OnboardingState } from './onboarding-state.type';
import type { OnboardingStepKey } from '../onboarding-step/onboarding-step-key.type';
import type { OnboardingStepOutput } from '../onboarding-step/onboarding-step-output.interface';
import type { OnboardingStepHistoryEntry } from '../onboarding-step/onboarding-step-history-entry.interface';

/**
 * Interface OnboardingOutput
 * @interface OnboardingOutput
 *
 * @description
 * Aggregate onboarding state returned by the API
 * for the current user journey.
 */
export interface OnboardingOutput extends HydraItem {
  //#region Properties
  /**
   * Property flow
   * @readonly
   *
   * @description
   * Backend flow identifier for the onboarding
   * process.
   *
   * @type {string}
   */
  readonly flow: string;

  /**
   * Property state
   * @readonly
   *
   * @description
   * Current overall onboarding state.
   *
   * @type {OnboardingState}
   */
  readonly state: OnboardingState;

  /**
   * Property nextStep
   * @readonly
   *
   * @description
   * Next step key that the user should complete.
   *
   * @type {OnboardingStepKey | null}
   */
  readonly nextStep: OnboardingStepKey | null;

  /**
   * Property blockedReason
   * @readonly
   *
   * @description
   * Backend explanation when the onboarding flow is
   * currently blocked.
   *
   * @type {string | null}
   */
  readonly blockedReason: string | null;

  /**
   * Property completedSteps
   * @readonly
   *
   * @description
   * Keys of onboarding steps already completed.
   *
   * @type {readonly OnboardingStepKey[]}
   */
  readonly completedSteps: readonly OnboardingStepKey[];

  /**
   * Property skippedSteps
   * @readonly
   *
   * @description
   * Keys of onboarding steps explicitly skipped.
   *
   * @type {readonly OnboardingStepKey[]}
   */
  readonly skippedSteps: readonly OnboardingStepKey[];

  /**
   * Property steps
   * @readonly
   *
   * @description
   * Detailed status of all onboarding steps.
   *
   * @type {readonly OnboardingStepOutput[]}
   */
  readonly steps: readonly OnboardingStepOutput[];

  /**
   * Property stepHistory
   * @readonly
   *
   * @description
   * Historical record of completed or skipped steps.
   *
   * @type {readonly OnboardingStepHistoryEntry[]}
   */
  readonly stepHistory: readonly OnboardingStepHistoryEntry[];

  /**
   * Property targetOrganizationId
   * @readonly
   *
   * @description
   * Identifier of the organization created or targeted
   * by the onboarding flow.
   *
   * @type {string | null}
   */
  readonly targetOrganizationId: string | null;

  /**
   * Property targetOrganizationName
   * @readonly
   *
   * @description
   * Name of the organization created or targeted by
   * the onboarding flow.
   *
   * @type {string | null}
   */
  readonly targetOrganizationName: string | null;

  /**
   * Property canRollback
   * @readonly
   *
   * @description
   * Whether the current onboarding state allows a
   * rollback action.
   *
   * @type {boolean}
   */
  readonly canRollback: boolean;

  /**
   * Property lastRollbackableStep
   * @readonly
   *
   * @description
   * Last step key that can be rolled back.
   *
   * @type {OnboardingStepKey | null}
   */
  readonly lastRollbackableStep: OnboardingStepKey | null;

  /**
   * Property rollbackMethod
   * @readonly
   *
   * @description
   * HTTP method to use for the rollback action.
   *
   * @type {string | null}
   */
  readonly rollbackMethod: string | null;

  /**
   * Property rollbackPath
   * @readonly
   *
   * @description
   * API path to call for the rollback action.
   *
   * @type {string | null}
   */
  readonly rollbackPath: string | null;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Timestamp of the last onboarding state update.
   *
   * @type {string | null}
   */
  readonly updatedAt: string | null;
  //#endregion
}
