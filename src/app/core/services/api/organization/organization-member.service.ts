import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { RequestOptions } from '../base-api.service';
import type { HydraCollection } from '@core/models/api';
import type {
  OrganizationMemberOutput,
  AddOrganizationMemberInput,
} from '@core/models/organization';

/**
 * Service OrganizationMemberService
 * @class OrganizationMemberService
 * @extends {BaseApiService}
 *
 * @description
 * API service for organization member management.
 * Handles listing existing members and adding new members
 * to an organization.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class OrganizationMemberService extends BaseApiService {
  //#region Public Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of members belonging to the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<OrganizationMemberOutput>>} An observable emitting the members collection.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationMemberOutput>> {
    return this.getCollection<OrganizationMemberOutput>(
      `/api/organizations/${organizationId}/members`,
      options,
    );
  }

  /**
   * Method add
   * @method add
   *
   * @description
   * Adds an existing user to the organization as a new member.
   * Optionally assigns one or more roles to the new member.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {AddOrganizationMemberInput} input - Input containing the user ID and optional role IDs.
   *
   * @return {Observable<OrganizationMemberOutput>} An observable emitting the added member details.
   */
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
