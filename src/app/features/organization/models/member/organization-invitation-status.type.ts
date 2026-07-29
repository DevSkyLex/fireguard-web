/**
 * Type OrganizationInvitationStatus
 * @type OrganizationInvitationStatus
 *
 * @description
 * Lifecycle of an organization invitation, mirroring the API's
 * `OrganizationInvitationStatus` enum.
 *
 * `expired` is an **effective** status: the backend resolves a pending
 * invitation past its `expiresAt` to `expired` before serving it, so a consumer
 * never has to compare dates to know whether the invitation can still be
 * accepted.
 *
 * @since 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
