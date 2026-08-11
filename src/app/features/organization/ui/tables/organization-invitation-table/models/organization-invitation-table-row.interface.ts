import type { OrganizationInvitationOutput } from '@features/organization/models';

/**
 * Interface OrganizationInvitationTableRow
 *
 * @description
 * One invitation joined with what the table renders but the transport type
 * does not carry directly: resolved role names, the status descriptor's
 * label/icon/tint, and the accept link when the store's session-only map
 * still holds one.
 *
 * @since 1.0.0
 */
export interface OrganizationInvitationTableRow {
  /** The raw invitation. */
  readonly invitation: OrganizationInvitationOutput;

  /** `invitation.roleIds` resolved to names, in the order the API returned them. */
  readonly roleNames: readonly string[];

  /** The status descriptor's localized label. */
  readonly statusLabel: string;

  /** The status descriptor's registered icon name. */
  readonly statusIcon: string;

  /** The status descriptor's severity, mapped to an icon colour class. */
  readonly statusIconClass: string;

  /** The fresh accept link, or `null` when the token was never captured this session. */
  readonly acceptUrl: string | null;
}
