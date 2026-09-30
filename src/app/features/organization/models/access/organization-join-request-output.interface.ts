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
  /**
   * Property id
   *
   * @description
   * Identifier of the membership request.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  id: string;

  /**
   * Property organizationId
   *
   * @description
   * Organization whose membership is being requested.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  organizationId: string;

  /**
   * Property organizationName
   *
   * @description
   * Organization name displayed with the request.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  organizationName: string;

  /**
   * Property status
   *
   * @description
   * Current server-owned lifecycle state of the membership request.
   *
   * @access public
   * @since unreleased
   *
   * @type {'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'}
   */
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';

  /**
   * Property createdAt
   *
   * @description
   * Timestamp when the membership request was submitted.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  createdAt: string;

  /**
   * Property expiresAt
   *
   * @description
   * Timestamp after which the pending request expires.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  expiresAt: string;

  /**
   * Property actions
   *
   * @description
   * Server-authorized actions available to the current caller for this request.
   *
   * @access public
   * @since unreleased
   *
   * @type {('cancel' | 'approve' | 'reject' | 'open')[]}
   */
  actions: ('cancel' | 'approve' | 'reject' | 'open')[];

  /**
   * Property applicantEmail
   *
   * @description
   * Verified applicant address, exposed only to authorized reviewers.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  applicantEmail?: string;
}
