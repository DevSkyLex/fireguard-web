import type { HydraItem } from '@core/api/models';
import type { OrganizationAvailableInvitationOutput } from './organization-available-invitation-output.interface';
import type { OrganizationJoinOptionOutput } from './organization-join-option-output.interface';
import type { OrganizationJoinRequestOutput } from './organization-join-request-output.interface';

/**
 * Interface OrganizationJoinOptionsOutput
 * @interface OrganizationJoinOptionsOutput
 *
 * @description
 * Private workspace choices for the authenticated identity.
 *
 * @since 1.0.0
 */
export interface OrganizationJoinOptionsOutput extends HydraItem {
  /**
   * Property emailProofRequired
   *
   * @description
   * Whether this join flow requires proof of mailbox ownership.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  emailProofRequired: boolean;

  /**
   * Property invitations
   *
   * @description
   * Invitations addressed to the authenticated user.
   *
   * @access public
   * @since unreleased
   *
   * @type {OrganizationAvailableInvitationOutput[]}
   */
  invitations: OrganizationAvailableInvitationOutput[];

  /**
   * Property organizations
   *
   * @description
   * Discoverable organizations and their permitted join actions.
   *
   * @access public
   * @since unreleased
   *
   * @type {OrganizationJoinOptionOutput[]}
   */
  organizations: OrganizationJoinOptionOutput[];

  /**
   * Property requests
   *
   * @description
   * The caller’s existing join requests included in the selection response.
   *
   * @access public
   * @since unreleased
   *
   * @type {OrganizationJoinRequestOutput[]}
   */
  requests: OrganizationJoinRequestOutput[];
}
