import type { ApprovalStatus } from '../approval-request/approval-status.type';
import type { ApprovalTagDescriptor } from './approval-tag-descriptor.interface';

/**
 * Status descriptors for every `ApprovalStatus` value. `cancelled` is a
 * system transition (the deferred action stopped applying before a decision
 * landed), so it is tinted the same neutral-warning weight as `expired`
 * rather than `rejected` — nobody decided against it.
 */
const APPROVAL_STATUS: Record<ApprovalStatus, ApprovalTagDescriptor> = {
  pending: {
    label: $localize`:@@approvals.status.pending:Pending`,
    severity: 'warning',
    icon: 'lucideClock',
  },
  approved: {
    label: $localize`:@@approvals.status.approved:Approved`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  rejected: {
    label: $localize`:@@approvals.status.rejected:Rejected`,
    severity: 'danger',
    icon: 'lucideCircleX',
  },
  cancelled: {
    label: $localize`:@@approvals.status.cancelled:Cancelled`,
    severity: 'neutral',
    icon: 'lucideBan',
  },
  expired: {
    label: $localize`:@@approvals.status.expired:Expired`,
    severity: 'neutral',
    icon: 'lucideHourglass',
  },
};

/**
 * Function resolveApprovalTag
 *
 * @description
 * Resolves the presentation descriptor for an `ApprovalStatus` value. Falls
 * back to a neutral, humanised descriptor for an unknown value so the UI
 * degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw status value.
 *
 * @returns {ApprovalTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveApprovalTag(value: string): ApprovalTagDescriptor {
  return (
    APPROVAL_STATUS[value as ApprovalStatus] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
