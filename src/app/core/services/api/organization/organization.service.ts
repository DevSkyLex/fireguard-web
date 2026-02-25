import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { RequestOptions } from '../base-api.service';
import type { HydraCollection } from '@core/models/api';
import type {
  OrganizationOutput,
  CreateOrganizationInput,
  OrganizationInvitationOutput,
} from '@core/models/organization';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService extends BaseApiService {
  //#region Constants
  private static readonly BASE_PATH: string = '/api/organizations';
  //#endregion

  //#region Public Methods
  public list(options?: RequestOptions): Observable<HydraCollection<OrganizationOutput>> {
    return this.getCollection<OrganizationOutput>(
      OrganizationService.BASE_PATH,
      options,
    );
  }

  public get(id: string): Observable<OrganizationOutput> {
    return this.getOne<OrganizationOutput>(`${OrganizationService.BASE_PATH}/${id}`);
  }

  public create(input: CreateOrganizationInput): Observable<OrganizationOutput> {
    return this.post<CreateOrganizationInput, OrganizationOutput>(
      OrganizationService.BASE_PATH,
      input,
    );
  }

  public listInvitations(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationInvitationOutput>> {
    return this.getCollection<OrganizationInvitationOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/invitations`,
      options,
    );
  }

  public revokeInvitation(
    organizationId: string,
    invitationId: string,
  ): Observable<OrganizationInvitationOutput> {
    return this.postAction<OrganizationInvitationOutput>(
      `${OrganizationService.BASE_PATH}/${organizationId}/invitations/${invitationId}/revoke`,
    );
  }
  //#endregion
}
