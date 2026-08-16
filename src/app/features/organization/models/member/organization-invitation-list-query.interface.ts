import type { OrganizationInvitationStatus } from './organization-invitation-status.type';

/**
 * Interface OrganizationInvitationListQuery
 * @interface OrganizationInvitationListQuery
 *
 * @description
 * Filters for `GET /api/organizations/{organizationId}/invitations`. Every
 * field is optional; an omitted {@link status} returns every status. The
 * endpoint's `status` filter accepts exactly one value — there is no way to
 * ask for "pending or expired" in one request.
 *
 * @since 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationInvitationListQuery {
  //#region Properties
  /** @type {OrganizationInvitationStatus} */
  readonly status?: OrganizationInvitationStatus;
  //#endregion
}
