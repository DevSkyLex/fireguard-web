import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { InviteOrganizationMemberInput, OrganizationInvitationOutput } from '@core/models/organization';

/**
 * Service OrganizationInvitationService
 * @class OrganizationInvitationService
 * @extends {BaseApiService}
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
export class OrganizationInvitationService extends BaseApiService {
  //#region Public Methods
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
  public invite(organizationId: string, input: InviteOrganizationMemberInput): Observable<OrganizationInvitationOutput> {
    return this.post<InviteOrganizationMemberInput, OrganizationInvitationOutput>(
      `/api/organizations/${organizationId}/invitations`,
      input,
    );
  }
  //#endregion
}
