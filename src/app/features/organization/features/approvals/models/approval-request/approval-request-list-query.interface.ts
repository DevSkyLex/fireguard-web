import type { ApprovalStatus } from './approval-status.type';

/**
 * Interface ApprovalRequestListQuery
 * @interface ApprovalRequestListQuery
 *
 * @description
 * Filters for `GET /api/organizations/{organizationId}/approval-requests`.
 * Both fields are optional and simply omitted when unset, matching
 * `OrganizationMemberListQuery`'s shape.
 *
 * @since 1.0.0
 */
export interface ApprovalRequestListQuery {
  /** @type {ApprovalStatus | undefined} */
  readonly status?: ApprovalStatus;
  /** Bare action-type key. @type {string | undefined} */
  readonly actionType?: string;
}
