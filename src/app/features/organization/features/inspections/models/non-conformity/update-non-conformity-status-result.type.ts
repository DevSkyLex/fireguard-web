import type { NonConformityOutput } from './non-conformity-output.interface';
import type { NonConformityWaivePendingOutput } from './non-conformity-waive-pending-output.interface';

/**
 * Interface NonConformityStatusUpdated
 * @interface NonConformityStatusUpdated
 *
 * @description
 * The `PATCH .../status` call resolved synchronously (HTTP 200) — the
 * returned non-conformity already carries the new status.
 *
 * @since 1.0.0
 */
export interface NonConformityStatusUpdated {
  //#region Properties
  /** @type {'updated'} */
  readonly kind: 'updated';
  /** @type {NonConformityOutput} */
  readonly nonConformity: NonConformityOutput;
  //#endregion
}

/**
 * Interface NonConformityStatusPendingApproval
 * @interface NonConformityStatusPendingApproval
 *
 * @description
 * The `PATCH .../status` call resolved as HTTP 202 — waiving this
 * non-conformity requires a decision from the organization's four-eyes
 * approvals inbox, and its status is unchanged.
 *
 * @since 1.0.0
 */
export interface NonConformityStatusPendingApproval {
  //#region Properties
  /** @type {'pendingApproval'} */
  readonly kind: 'pendingApproval';
  /** @type {NonConformityWaivePendingOutput} */
  readonly pending: NonConformityWaivePendingOutput;
  //#endregion
}

/**
 * Type UpdateNonConformityStatusResult
 *
 * @description
 * Discriminated union covering both outcomes `InspectionService.updateNonConformityStatus`
 * exposes for the same endpoint's two success statuses (`ARCHITECTURE.md`
 * §11.6 — a service returns transport types only, never collapses a
 * meaningful status distinction).
 *
 * @since 1.0.0
 */
export type UpdateNonConformityStatusResult =
  | NonConformityStatusUpdated
  | NonConformityStatusPendingApproval;
