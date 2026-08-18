import type { HydraItem } from '@core/api/models';
import type { ApprovalStatus } from './approval-status.type';

/**
 * Interface ApprovalRequestOutput
 * @interface ApprovalRequestOutput
 *
 * @description
 * One four-eyes approval request as returned by
 * `GET /api/organizations/{organizationId}/approval-requests`. Mirrors the
 * backend `Approval\Presentation\Api\Dto\Output\ApprovalRequestOutput` DTO
 * byte for byte — `subjectId` is the BARE gated resource id, never an IRI,
 * so a consumer resolving the subject (an equipment, a non-conformity) must
 * build the route itself from `actionType`. API Platform omits a null
 * optional field entirely rather than serializing it as `null`, so every
 * optional property here is read as possibly `undefined`, never `=== null`.
 *
 * @since 1.0.0
 */
export interface ApprovalRequestOutput extends HydraItem {
  /** @type {string} */
  readonly id: string;

  /** @type {string} */
  readonly organizationId: string;

  /** Regulated action-type key, e.g. `nc_waiver` or `equipment_decommission`. @type {string} */
  readonly actionType: string;

  /** Bare id of the gated resource, not an IRI. @type {string} */
  readonly subjectId: string;

  /** @type {ApprovalStatus} */
  readonly status: ApprovalStatus;

  /** @type {string} */
  readonly requestedByMemberId: string;

  /** @type {string} */
  readonly requestedByUserId: string;

  /** Absent until the request has been decided. @type {string | undefined} */
  readonly decisionByMemberId?: string;

  /** Absent until the request has been decided. @type {string | undefined} */
  readonly decisionByUserId?: string;

  /** The decider's optional free-form note, on either outcome. @type {string | undefined} */
  readonly decisionNote?: string;

  /** @type {string} */
  readonly expiresAt: string;

  /** @type {string} */
  readonly createdAt: string;

  /** @type {string} */
  readonly updatedAt: string;

  /** Absent while `pending`. @type {string | undefined} */
  readonly decidedAt?: string;

  /** Present only once the gated action has actually run. @type {string | undefined} */
  readonly executedAt?: string;

  /**
   * Why the deferred action could not execute — populated on the
   * `cancelled` transition the backend performs when approving a request
   * whose subject changed state in the meantime (409
   * deferred-action-no-longer-applicable).
   *
   * @type {string | undefined}
   */
  readonly executionError?: string;
}
