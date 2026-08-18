/**
 * Type ApprovalStatus
 * @type ApprovalStatus
 *
 * @description
 * Lifecycle of one four-eyes approval request, mirroring the backend
 * `Approval\Domain\ValueObject\ApprovalStatus` enum byte for byte.
 * `cancelled` is a system transition, never a decider action: the backend
 * moves a `pending` request there itself when the gated action's subject
 * changed state before a decision landed (409
 * deferred-action-no-longer-applicable on approve).
 *
 * @since 1.0.0
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
