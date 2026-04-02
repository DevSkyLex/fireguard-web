import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type { RequestOptions } from '../base-api.service';
import type { HydraCollection } from '@core/models/api';
import type {
  OrganizationRoleOutput,
  CreateOrganizationRoleInput,
  UpdateOrganizationRoleInput,
  AssignOrganizationRoleInput,
  OrganizationMemberOutput,
} from '@core/models/organization';

/**
 * Service OrganizationRoleService
 * @class OrganizationRoleService
 * @extends {BaseApiService}
 *
 * @description
 * API service for organization role management.
 * Handles listing, creating, and updating roles,
 * as well as assigning roles to members.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class OrganizationRoleService extends BaseApiService {
  //#region Public Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of roles defined for the given organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<OrganizationRoleOutput>>} An observable emitting the roles collection.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationRoleOutput>> {
    return this.getCollection<OrganizationRoleOutput>(
      `/api/organizations/${organizationId}/roles`,
      options,
    );
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a new role within the given organization
   * with the specified name, description, and permissions.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {CreateOrganizationRoleInput} input - The data required to create the role.
   *
   * @return {Observable<OrganizationRoleOutput>} An observable emitting the created role details.
   */
  public create(
    organizationId: string,
    input: CreateOrganizationRoleInput,
  ): Observable<OrganizationRoleOutput> {
    return this.post<CreateOrganizationRoleInput, OrganizationRoleOutput>(
      `/api/organizations/${organizationId}/roles`,
      input,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Updates an existing role using a partial merge-patch.
   * Only the fields included in the input will be modified.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} roleId - The ID of the role to update.
   * @param {UpdateOrganizationRoleInput} input - The partial data to apply to the role.
   *
   * @return {Observable<OrganizationRoleOutput>} An observable emitting the updated role details.
   */
  public update(
    organizationId: string,
    roleId: string,
    input: UpdateOrganizationRoleInput,
  ): Observable<OrganizationRoleOutput> {
    return this.patch<UpdateOrganizationRoleInput, OrganizationRoleOutput>(
      `/api/organizations/${organizationId}/roles/${roleId}`,
      input,
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes a role defined within the given organization.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} roleId - The ID of the role to delete.
   *
   * @return {Observable<void>} Observable completing on success.
   */
  public remove(organizationId: string, roleId: string): Observable<void> {
    return this.delete(`/api/organizations/${organizationId}/roles/${roleId}`);
  }

  /**
   * Method assignToMember
   * @method assignToMember
   *
   * @description
   * Assigns a role to an existing organization member,
   * granting the permissions associated with that role.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} memberId - The ID of the member to assign the role to.
   * @param {AssignOrganizationRoleInput} input - Input containing the role ID to assign.
   *
   * @return {Observable<OrganizationMemberOutput>} An observable emitting the updated member details.
   */
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

  /**
   * Method removeFromMember
   * @method removeFromMember
   *
   * @description
   * Removes a role assignment from an organization member.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} memberId - The ID of the member whose role should be removed.
   * @param {string} roleId - The ID of the role assignment to remove.
   *
   * @return {Observable<void>} Observable completing on success.
   */
  public removeFromMember(
    organizationId: string,
    memberId: string,
    roleId: string,
  ): Observable<void> {
    return this.delete(
      `/api/organizations/${organizationId}/members/${memberId}/roles/${roleId}`,
    );
  }
  //#endregion
}
