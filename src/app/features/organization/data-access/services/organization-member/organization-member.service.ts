import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { HydraApiService, type RequestOptions } from '@core/services/hydra-api';
import type {
  OrganizationMemberOutput,
  AddOrganizationMemberInput,
  CurrentOrganizationMemberProfileOutput,
} from '@features/organization/models';

/**
 * Service OrganizationMemberService
 * @class OrganizationMemberService
 * @extends {HydraApiService}
 *
 * @description
 * API service for organization member management.
 * Handles loading the authenticated member profile, listing existing
 * members, and adding or removing members in an organization.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class OrganizationMemberService extends HydraApiService {
  //#region Public Methods
  /**
   * Method getCurrentProfile
   * @method getCurrentProfile
   *
   * @description
   * Retrieves the authenticated active member profile for the given organization,
   * including resolved roles and effective permissions.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} organizationId - The ID of the organization.
   *
   * @return {Observable<CurrentOrganizationMemberProfileOutput>} An observable emitting the current member profile.
   */
  public getCurrentProfile(
    organizationId: string,
  ): Observable<CurrentOrganizationMemberProfileOutput> {
    const url: string = `/api/organizations/${organizationId}/me`;
    return this.getOne<CurrentOrganizationMemberProfileOutput>(url);
  }

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
    const url: string = `/api/organizations/${organizationId}/members`;
    return this.getCollection<OrganizationMemberOutput>(url, options);
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
    const url: string = `/api/organizations/${organizationId}/members`;
    return this.post<AddOrganizationMemberInput, OrganizationMemberOutput>(url, input);
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Removes a member from the given organization.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} memberId - The ID of the member to remove.
   *
   * @return {Observable<void>} Observable completing on success.
   */
  public remove(organizationId: string, memberId: string): Observable<void> {
    const url: string = `/api/organizations/${organizationId}/members/${memberId}`;
    return this.delete(url);
  }
  //#endregion
}
