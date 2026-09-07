import type { HydraItem } from '@core/api/models';
/**
 * Interface OrganizationJoinRequestOutput
 * @interface OrganizationJoinRequestOutput
 *
 * @description
 * Membership request with server-authorized actions and lifecycle dates.
 *
 * @since 1.0.0
 */
export interface OrganizationJoinRequestOutput extends HydraItem {
  id: string;
  organizationId: string;
  organizationName: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
  actions: ('cancel' | 'approve' | 'reject' | 'open')[];
  /** Verified applicant address, exposed only to authorized reviewers. */
  applicantEmail?: string;
}
