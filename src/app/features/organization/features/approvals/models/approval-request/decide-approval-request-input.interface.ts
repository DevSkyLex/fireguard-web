/**
 * Interface DecideApprovalRequestInput
 * @interface DecideApprovalRequestInput
 *
 * @description
 * Payload for both `POST .../approve` and `POST .../reject` — the backend's
 * `ApproveApprovalRequestInput` and `RejectApprovalRequestInput` DTOs share
 * this exact one-field shape, so one frontend type covers both endpoints.
 *
 * @since 1.0.0
 */
export interface DecideApprovalRequestInput {
  /** Free-form note, max 2000 characters, enforced client-side by the decision dialog. @type {string | undefined} */
  readonly decisionNote?: string;
}
