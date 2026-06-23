import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type {
  AcceptOrganizationInvitationInput,
  InviteOrganizationMemberInput,
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
} from '@features/organization/models';

/**
 * Service OrganizationInvitationService
 * @class OrganizationInvitationService
 * @extends {HydraApiService}
 *
 * @description
 * API service for organization invitation management.
 * Handles inviting new users to join an organization
 * via email.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class OrganizationInvitationService extends HydraApiService {
  //#region Public Methods
  /**
   * Method accept
   * @method accept
   *
   * @description
   * Accepts an organization invitation using the token received by email
   * and returns the created membership resource.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {AcceptOrganizationInvitationInput} input - Invitation acceptance payload.
   *
   * @return {Observable<OrganizationMemberOutput>} An observable emitting the created organization membership.
   */
  public accept(input: AcceptOrganizationInvitationInput): Observable<OrganizationMemberOutput> {
    return this.post<AcceptOrganizationInvitationInput, OrganizationMemberOutput>(
      '/api/organizations/invitations/accept',
      input,
    );
  }

  /**
   * Method invite
   * @method invite
   *
   * @description
   * Sends an invitation email to the specified address,
   * allowing the recipient to join the organization.
   * Optionally assigns roles to the invitee upon acceptance.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization to invite the user to.
   * @param {InviteOrganizationMemberInput} input - Input containing the email and optional role IDs.
   *
   * @return {Observable<OrganizationInvitationOutput>} An observable emitting the created invitation details.
   */
  public invite(
    organizationId: string,
    input: InviteOrganizationMemberInput,
  ): Observable<OrganizationInvitationOutput> {
    return this.post<InviteOrganizationMemberInput, OrganizationInvitationOutput>(
      `/api/organizations/${organizationId}/invitations`,
      input,
    );
  }
  //#endregion
}
