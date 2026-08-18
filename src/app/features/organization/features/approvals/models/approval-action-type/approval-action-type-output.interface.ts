import type { HydraItem } from '@core/api/models';

/**
 * Interface ApprovalActionTypeOutput
 * @interface ApprovalActionTypeOutput
 *
 * @description
 * One entry of the regulated action-type catalog returned by
 * `GET /api/approvals/action-types` — a reference-catalog resource
 * (`value` is the API Platform identifier), not an organization-scoped
 * business resource. Mirrors the backend
 * `Approval\Presentation\Api\Dto\Output\ApprovalActionTypeOutput` DTO.
 *
 * @since 1.0.0
 */
export interface ApprovalActionTypeOutput extends HydraItem {
  /** Bare action-type key, e.g. `nc_waiver`. @type {string} */
  readonly value: string;
  /** Backend-supplied display label. @type {string} */
  readonly label: string;
}
