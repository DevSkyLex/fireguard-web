/**
 * Interface NonConformityWaivePendingOutput
 * @interface NonConformityWaivePendingOutput
 *
 * @description
 * Body of the **202** response `PATCH .../non-conformities/{id}/status`
 * returns when waiving requires four-eyes approval (the org's waiver gate is
 * enabled and the non-conformity's severity meets the policy threshold). The
 * non-conformity itself is left untouched server-side — still `open` or
 * `in_progress` — until the request is decided from the organization's
 * approvals inbox. Idempotent: re-submitting the same waive while the
 * request is pending returns this same body again, keyed by the same
 * `approvalRequestId`.
 *
 * @since 1.0.0
 */
export interface NonConformityWaivePendingOutput {
  //#region Properties
  /** Discriminates this body from a plain `NonConformityOutput`. @type {'pending_approval'} */
  readonly status: 'pending_approval';
  /** The created four-eyes approval request's id. @type {string} */
  readonly approvalRequestId: string;
  /** The approval request's own lifecycle status — `pending` for every response reaching this shape. @type {string} */
  readonly approvalStatus: string;
  /** When the pending request expires if never decided. @type {string} */
  readonly expiresAt: string;
  //#endregion
}
