import type { CallState } from '@core/request-state';
import type { EmailOwnershipChallengeOutput, EmailOwnershipOutput } from '@features/auth/models';
import type { OnboardingOutput } from '@features/onboarding/models';
import type {
  OrganizationJoinOptionsOutput,
  OrganizationAdmissionOutput,
  OrganizationJoinRequestOutput,
} from '@features/organization/models';

/**
 * Interface WorkspaceState
 * @interface WorkspaceState
 *
 * @description
 * Independent query and command states for workspace selection and mailbox verification.
 *
 * @since 1.0.0
 */
export interface WorkspaceState {
  /**
   * Property createCallState
   *
   * @description
   * Outcome of creating the caller's initial organization workspace.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<OnboardingOutput>}
   */
  createCallState: CallState<OnboardingOutput>;

  /**
   * Property optionsCallState
   *
   * @description
   * Outcome of loading public organization join choices.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<OrganizationJoinOptionsOutput>}
   */
  optionsCallState: CallState<OrganizationJoinOptionsOutput>;

  /**
   * Property admissionCallState
   *
   * @description
   * Outcome of resolving whether the current user can join a workspace.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<OrganizationAdmissionOutput>}
   */
  admissionCallState: CallState<OrganizationAdmissionOutput>;

  /**
   * Property requestCallState
   *
   * @description
   * Outcome of requesting membership in the selected organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<OrganizationJoinRequestOutput>}
   */
  requestCallState: CallState<OrganizationJoinRequestOutput>;

  /**
   * Property cancelCallState
   *
   * @description
   * Outcome of cancelling the caller's pending organization join request.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<OrganizationJoinRequestOutput>}
   */
  cancelCallState: CallState<OrganizationJoinRequestOutput>;

  /**
   * Property challengeCallState
   *
   * @description
   * Outcome of requesting proof that the caller owns their email address.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<EmailOwnershipChallengeOutput>}
   */
  challengeCallState: CallState<EmailOwnershipChallengeOutput>;

  /**
   * Property confirmCallState
   *
   * @description
   * Outcome of confirming mailbox ownership for the pending workspace flow.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<EmailOwnershipOutput>}
   */
  confirmCallState: CallState<EmailOwnershipOutput>;
}
