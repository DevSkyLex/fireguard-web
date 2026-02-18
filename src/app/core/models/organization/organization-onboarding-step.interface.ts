import type { OrganizationOnboardingStepKey } from './onboarding-step-key.type';
import type { OrganizationOnboardingStepStatus } from './onboarding-step-status.type';

/**
 * Interface OrganizationOnboardingStep
 * @interface OrganizationOnboardingStep
 *
 * @description
 * A single step entry returned by onboarding status endpoint.
 *
 * @version 1.0.0
 */
export interface OrganizationOnboardingStep {
  /**
   * Property key
   * @readonly
   *
   * @description
   * Step unique key.
   *
   * @type {OrganizationOnboardingStepKey}
   */
  readonly key: OrganizationOnboardingStepKey;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable step label.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current step status.
   *
   * @type {OrganizationOnboardingStepStatus}
   */
  readonly status: OrganizationOnboardingStepStatus;

  /**
   * Property required
   * @readonly
   *
   * @description
   * Whether this step is required by backend rules.
   *
   * @type {boolean}
   */
  readonly required: boolean;

  /**
   * Property available
   * @readonly
   *
   * @description
   * Whether this step can currently be executed.
   *
   * @type {boolean}
   */
  readonly available: boolean;

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Optional backend reason when the step is blocked/unavailable.
   *
   * @type {string | null}
   */
  readonly reason: string | null;
}

