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
 * @description Independent query and command states for workspace selection and mailbox verification.
 * @since 1.0.0
 */
export interface WorkspaceState {
  createCallState: CallState<OnboardingOutput>;
  optionsCallState: CallState<OrganizationJoinOptionsOutput>;
  admissionCallState: CallState<OrganizationAdmissionOutput>;
  requestCallState: CallState<OrganizationJoinRequestOutput>;
  cancelCallState: CallState<OrganizationJoinRequestOutput>;
  challengeCallState: CallState<EmailOwnershipChallengeOutput>;
  confirmCallState: CallState<EmailOwnershipOutput>;
}
