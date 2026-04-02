import type { OnboardingStepKey } from './onboarding-step-key.type';
import type { OnboardingStepStatus } from './onboarding-step-status.type';

/**
 * Interface OnboardingStepOutput
 * @interface OnboardingStepOutput
 *
 * @description
 * Detailed status of one step in the onboarding
 * flow.
 */
export interface OnboardingStepOutput {
  //#region Properties
  /**
   * Property key
   * @readonly
   *
   * @description
   * Unique step key defined by the backend.
   *
   * @type {OnboardingStepKey}
   */
  readonly key: OnboardingStepKey;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable label displayed for the step.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current status of the onboarding step.
   *
   * @type {OnboardingStepStatus}
   */
  readonly status: OnboardingStepStatus;

  /**
   * Property required
   * @readonly
   *
   * @description
   * Whether the step must be completed to finish
   * the onboarding flow.
   *
   * @type {boolean}
   */
  readonly required: boolean;

  /**
   * Property available
   * @readonly
   *
   * @description
   * Whether the step can currently be executed.
   *
   * @type {boolean}
   */
  readonly available: boolean;

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Backend explanation when the step is not
   * available.
   *
   * @type {string | null}
   */
  readonly reason: string | null;

  /**
   * Property actionMethod
   * @readonly
   *
   * @description
   * HTTP method associated with the step action.
   *
   * @type {string | null}
   */
  readonly actionMethod: string | null;

  /**
   * Property actionPath
   * @readonly
   *
   * @description
   * API path to invoke for the step action.
   *
   * @type {string | null}
   */
  readonly actionPath: string | null;

  /**
   * Property rollbackAvailable
   * @readonly
   *
   * @description
   * Whether a rollback action is available for the
   * step.
   *
   * @type {boolean}
   */
  readonly rollbackAvailable: boolean;

  /**
   * Property rollbackMethod
   * @readonly
   *
   * @description
   * HTTP method to use for rolling back the step.
   *
   * @type {string | null}
   */
  readonly rollbackMethod: string | null;

  /**
   * Property rollbackPath
   * @readonly
   *
   * @description
   * API path to invoke for rolling back the step.
   *
   * @type {string | null}
   */
  readonly rollbackPath: string | null;

  /**
   * Property skippable
   * @readonly
   *
   * @description
   * Whether the step may be skipped by the user.
   *
   * @type {boolean}
   */
  readonly skippable: boolean;

  /**
   * Property skipAvailable
   * @readonly
   *
   * @description
   * Whether the skip action is currently available.
   *
   * @type {boolean}
   */
  readonly skipAvailable: boolean;

  /**
   * Property skipMethod
   * @readonly
   *
   * @description
   * HTTP method to use for skipping the step.
   *
   * @type {string | null}
   */
  readonly skipMethod: string | null;

  /**
   * Property skipPath
   * @readonly
   *
   * @description
   * API path to invoke for skipping the step.
   *
   * @type {string | null}
   */
  readonly skipPath: string | null;

  /**
   * Property completedAt
   * @readonly
   *
   * @description
   * Timestamp indicating when the step was completed.
   *
   * @type {string | null}
   */
  readonly completedAt: string | null;
  //#endregion
}
