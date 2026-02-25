import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { RequestOptions } from '../base-api.service';
import type { HydraCollection } from '@core/models/api';
import type {
  OrganizationRoleOutput,
  CreateOrganizationRoleInput,
  AssignOrganizationRoleInput,
  OrganizationMemberOutput,
} from '@core/models/organization';

@Injectable({
  providedIn: 'root',
})
export class OrganizationRoleService extends BaseApiService {
  //#region Public Methods
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationRoleOutput>> {
    return this.getCollection<OrganizationRoleOutput>(
      `/api/organizations/${organizationId}/roles`,
      options,
    );
  }

  public create(
    organizationId: string,
    input: CreateOrganizationRoleInput,
  ): Observable<OrganizationRoleOutput> {
    return this.post<CreateOrganizationRoleInput, OrganizationRoleOutput>(
      `/api/organizations/${organizationId}/roles`,
      input,
    );
  }

  public assignToMember(
    organizationId: string,
    memberId: string,
    input: AssignOrganizationRoleInput,
  ): Observable<OrganizationMemberOutput> {
    return this.post<AssignOrganizationRoleInput, OrganizationMemberOutput>(
      `/api/organizations/${organizationId}/members/${memberId}/roles`,
      input,
    );
  }
  //#endregion
}
