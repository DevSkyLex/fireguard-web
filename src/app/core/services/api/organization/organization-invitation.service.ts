import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { InviteOrganizationMemberInput, OrganizationInvitationOutput } from '@core/models/organization';

@Injectable({
  providedIn: 'root',
})
export class OrganizationInvitationService extends BaseApiService {
  //#region Public Methods
  public invite(organizationId: string, input: InviteOrganizationMemberInput): Observable<OrganizationInvitationOutput> {
    return this.post<InviteOrganizationMemberInput, OrganizationInvitationOutput>(
      `/api/organizations/${organizationId}/invitations`,
      input,
    );
  }
  //#endregion
}
