import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationInvitationPreviewOutput
 * @interface OrganizationInvitationPreviewOutput
 *
 * @description
 * Minimal, public-safe projection of an invitation resolved by token, returned
 * by the unauthenticated preview endpoint so an invitee can see who invited
 * them before signing in or creating an account.
 */
export interface OrganizationInvitationPreviewOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly organizationId: string;
  /** @type {string} */
  readonly organizationName: string;
  /** @type {string | null} */
  readonly organizationLogoUrl: string | null;
  /** @type {string} */
  readonly inviterDisplayName: string;
  /** @type {string} */
  readonly invitedEmail: string;
  /** @type {string} */
  readonly status: string;
  /** @type {string} */
  readonly expiresAt: string;
  //#endregion
}
