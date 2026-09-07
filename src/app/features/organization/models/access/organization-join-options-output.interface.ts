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
  emailProofRequired: boolean;
  invitations: OrganizationAvailableInvitationOutput[];
  organizations: OrganizationJoinOptionOutput[];
  requests: OrganizationJoinRequestOutput[];
}
