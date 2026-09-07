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
  id: string;
  organizationId: string;
  organizationName: string;
  expiresAt: string;
}
