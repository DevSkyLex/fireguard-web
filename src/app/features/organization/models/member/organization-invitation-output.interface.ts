import type { HydraItem } from '@core/api/models';
import type { OrganizationInvitationStatus } from './organization-invitation-status.type';

/**
 * Interface OrganizationInvitationOutput
 * @interface OrganizationInvitationOutput
 *
 * @description
 * Invitation resource returned by the organization API.
 */
export interface OrganizationInvitationOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly organizationId: string;
  /** @type {string} */
  readonly email: string;
  /** @type {string} */
  readonly status: OrganizationInvitationStatus;
  /** @type {string} */
  readonly invitedByUserId: string;
  /** @type {string | null | undefined} */
  readonly invitedByDisplayName?: string | null;
  /** @type {string | null} */
  readonly acceptedByUserId: string | null;
  /** @type {string | null} */
  readonly revokedByUserId: string | null;
  /** @type {string} */
  readonly expiresAt: string;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  /** @type {ReadonlyArray<string>} */
  readonly roleIds: ReadonlyArray<string>;
  /**
   * Public accept link, populated only on invite/resend responses (the token is
   * never recoverable from a listed invitation). Empty otherwise.
   *
   * @type {string}
   */
  readonly acceptUrl?: string;
  //#endregion
}
