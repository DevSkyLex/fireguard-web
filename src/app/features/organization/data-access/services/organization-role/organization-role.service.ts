import { Service } from '@angular/core';
import { EMPTY, expand, reduce, type Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  OrganizationRoleOutput,
  CreateOrganizationRoleInput,
  UpdateOrganizationRoleInput,
  AssignOrganizationRoleInput,
  ReplaceOrganizationMemberRolesInput,
  OrganizationMemberOutput,
} from '@features/organization/models';

/**
 * Service OrganizationRoleService
 * @class OrganizationRoleService
 * @extends {HydraApiService}
 *
 * @description
 * API service for organization role management.
 * Handles listing, creating, and updating roles,
 * as well as assigning roles to members.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class OrganizationRoleService extends HydraApiService {
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
   * Method listAll
   * @method listAll
   *
   * @description
   * Lists every role by walking the server-paginated collection page by page —
   * the roles endpoint is really paginated since API lot P2.4, so a single
   * `list()` call is a page, never the full catalog.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional extra request parameters.
   *
   * @return {Observable<readonly OrganizationRoleOutput[]>} An observable emitting the complete role list.
   */
  public listAll(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<readonly OrganizationRoleOutput[]> {
    const pageSize = 100;
    return this.list(organizationId, { ...options, page: 1, itemsPerPage: pageSize }).pipe(
      expand((collection, pageIndex) =>
        (pageIndex + 1) * pageSize < collection.totalItems
          ? this.list(organizationId, { ...options, page: pageIndex + 2, itemsPerPage: pageSize })
          : EMPTY,
      ),
      reduce(
        (items, collection) => [...items, ...collection.member],
        [] as readonly OrganizationRoleOutput[],
      ),
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves a single role, whose payload carries the `memberCount` the
   * paginated list does not guarantee.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} roleId - The ID of the role to read.
   *
   * @return {Observable<OrganizationRoleOutput>} An observable emitting the role.
   */
  public get(organizationId: string, roleId: string): Observable<OrganizationRoleOutput> {
    return this.getOne<OrganizationRoleOutput>(
      `/api/organizations/${organizationId}/roles/${roleId}`,
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
   * Only the fields included in the input will be modified. Since backend
   * 1.5.0 the payload accepts `name` alongside `description` and
   * `permissions`, so this is the rename path too; the backend refuses a
   * rename with **400** for a system role or a duplicate name.
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
   * Method replaceMemberRoles
   * @method replaceMemberRoles
   *
   * @description
   * Sets a member's role set to exactly `input.roleIds` in one request,
   * replacing the assign-one/revoke-one pair for editors that already know
   * the whole intended set. The member comes back with the resolved
   * assignment, so callers need no follow-up read.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} memberId - The ID of the member whose roles are being set.
   * @param {ReplaceOrganizationMemberRolesInput} input - The complete intended role set.
   *
   * @return {Observable<OrganizationMemberOutput>} An observable emitting the updated member.
   */
  public replaceMemberRoles(
    organizationId: string,
    memberId: string,
    input: ReplaceOrganizationMemberRolesInput,
  ): Observable<OrganizationMemberOutput> {
    return this.put<ReplaceOrganizationMemberRolesInput, OrganizationMemberOutput>(
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
    return this.delete(`/api/organizations/${organizationId}/members/${memberId}/roles/${roleId}`);
  }
  //#endregion
}
