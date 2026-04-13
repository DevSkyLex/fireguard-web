import type { HydraItem } from '@core/models/api';

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
  readonly status: string;
  /** @type {string} */
  readonly invitedByUserId: string;
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
  //#endregion
}
