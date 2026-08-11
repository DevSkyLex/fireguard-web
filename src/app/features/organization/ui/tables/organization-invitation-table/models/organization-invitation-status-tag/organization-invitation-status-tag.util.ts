import type { OrganizationInvitationStatus } from '@features/organization/models';
import type { OrganizationInvitationStatusTagDescriptor } from './organization-invitation-status-tag-descriptor.interface';

/**
 * Descriptors for `OrganizationInvitationOutput.status`. `pending` is the
 * only state still awaiting a response and stays neutral; `expired` is an
 * effective terminal state the backend resolves itself, so it reads as a
 * warning rather than a failure — resending clears it. `accepted` and
 * `revoked` are historical outcomes, not further actionable.
 */
const STATUS: Record<OrganizationInvitationStatus, OrganizationInvitationStatusTagDescriptor> = {
  pending: {
    label: $localize`:@@org.invitations.status.pending:Pending`,
    severity: 'neutral',
    icon: 'lucideClock',
  },
  accepted: {
    label: $localize`:@@org.invitations.status.accepted:Accepted`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  expired: {
    label: $localize`:@@org.invitations.status.expired:Expired`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  revoked: {
    label: $localize`:@@org.invitations.status.revoked:Revoked`,
    severity: 'danger',
    icon: 'lucideBan',
  },
};

/**
 * Function resolveOrganizationInvitationStatusTag
 *
 * @description
 * Resolves the presentation descriptor for an invitation status value. Falls
 * back to a neutral, humanised descriptor for an unknown value so the UI
 * degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw status value.
 *
 * @returns {OrganizationInvitationStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveOrganizationInvitationStatusTag(
  value: string,
): OrganizationInvitationStatusTagDescriptor {
  return (
    STATUS[value as OrganizationInvitationStatus] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
