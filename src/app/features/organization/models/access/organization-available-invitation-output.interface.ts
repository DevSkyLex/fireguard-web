import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationAvailableInvitationOutput
 * @interface OrganizationAvailableInvitationOutput
 *
 * @description
 * Invitation addressed to the authenticated user without its secret token.
 *
 * @since 1.0.0
 */
export interface OrganizationAvailableInvitationOutput extends HydraItem {
  /**
   * Property id
   *
   * @description
   * Identifier of the invitation available to the authenticated user.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  id: string;

  /**
   * Property organizationId
   *
   * @description
   * Organization that issued the invitation.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  organizationId: string;

  /**
   * Property organizationName
   *
   * @description
   * Organization name shown before the user accepts the invitation.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  organizationName: string;

  /**
   * Property expiresAt
   *
   * @description
   * Expiry timestamp after which the invitation can no longer be accepted.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  expiresAt: string;
}
