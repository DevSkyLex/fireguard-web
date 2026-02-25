import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type {
  OrganizationLegalProfileOutput,
  UpsertOrganizationLegalProfileInput,
} from '@core/models/organization';

@Injectable({
  providedIn: 'root',
})
export class OrganizationLegalProfileService extends BaseApiService {
  //#region Public Methods
  public get(organizationId: string): Observable<OrganizationLegalProfileOutput> {
    return this.getOne<OrganizationLegalProfileOutput>(
      `/api/organizations/${organizationId}/legal-profile`,
    );
  }

  public upsert(
    organizationId: string,
    input: UpsertOrganizationLegalProfileInput,
  ): Observable<OrganizationLegalProfileOutput> {
    return this.put<UpsertOrganizationLegalProfileInput, OrganizationLegalProfileOutput>(
      `/api/organizations/${organizationId}/legal-profile`,
      input,
    );
  }
  //#endregion
}
