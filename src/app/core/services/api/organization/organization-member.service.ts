import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { RequestOptions } from '../base-api.service';
import type { HydraCollection } from '@core/models/api';
import type {
  OrganizationMemberOutput,
  AddOrganizationMemberInput,
} from '@core/models/organization';

@Injectable({
  providedIn: 'root',
})
export class OrganizationMemberService extends BaseApiService {
  //#region Public Methods
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationMemberOutput>> {
    return this.getCollection<OrganizationMemberOutput>(
      `/api/organizations/${organizationId}/members`,
      options,
    );
  }

  public add(
    organizationId: string,
    input: AddOrganizationMemberInput,
  ): Observable<OrganizationMemberOutput> {
    return this.post<AddOrganizationMemberInput, OrganizationMemberOutput>(
      `/api/organizations/${organizationId}/members`,
      input,
    );
  }
  //#endregion
}
