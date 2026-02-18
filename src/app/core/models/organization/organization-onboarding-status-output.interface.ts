import type { OrganizationOnboardingNextStep } from './onboarding-next-step.type';
import type { OrganizationOnboardingState } from './onboarding-state.type';
import type { OrganizationOnboardingStep } from './organization-onboarding-step.interface';

/**
 * Interface OrganizationOnboardingStatusOutput
 * @interface OrganizationOnboardingStatusOutput
 *
 * @description
 * Onboarding status payload returned by:
 * `GET /api/organizations/onboarding/status`.
 *
 * @version 1.0.0
 */
export interface OrganizationOnboardingStatusOutput {
  /**
   * Property state
   * @readonly
   *
   * @description
   * Global onboarding state.
   *
   * @type {OrganizationOnboardingState}
   */
  readonly state: OrganizationOnboardingState;

  /**
   * Property nextStep
   * @readonly
   *
   * @description
   * Next onboarding step decided by backend.
   *
   * @type {OrganizationOnboardingNextStep | null}
   */
  readonly nextStep: OrganizationOnboardingNextStep | null;

  /**
   * Property blockedReason
   * @readonly
   *
   * @description
   * Optional global blocking reason.
   *
   * @type {string | null}
   */
  readonly blockedReason: string | null;

  /**
   * Property steps
   * @readonly
   *
   * @description
   * Ordered onboarding steps with detailed status.
   *
   * @type {readonly OrganizationOnboardingStep[]}
   */
  readonly steps: readonly OrganizationOnboardingStep[];

  /**
   * Property targetOrganizationId
   * @readonly
   *
   * @description
   * Target organization identifier used by onboarding facility step.
   *
   * @type {string | null}
   */
  readonly targetOrganizationId: string | null;

  /**
   * Property targetOrganizationName
   * @readonly
   *
   * @description
   * Target organization display name.
   *
   * @type {string | null}
   */
  readonly targetOrganizationName: string | null;
}
