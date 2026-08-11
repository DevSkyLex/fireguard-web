import { Service } from '@angular/core';
import { EMPTY, expand, reduce, type Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  OrganizationMemberOutput,
  AddOrganizationMemberInput,
  CurrentOrganizationMemberProfileOutput,
  OrganizationMemberListQuery,
  RemoveOrganizationMembersInput,
  RemoveOrganizationMembersResult,
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
@Service()
export class OrganizationMemberService extends HydraApiService {
  //#region Private Methods
  /**
   * Method toListParams
   * @method toListParams
   *
   * @description
   * Serializes the typed roster filters into the query parameters the members
   * endpoint expects, omitting anything unset so the server's own defaults
   * (`status=active`, `order[joinedAt]=asc`) still apply. Sorting becomes the
   * bracketed `order[<field>]=<direction>` pair, which is why a field without
   * a direction is dropped rather than guessed.
   *
   * @access private
   * @since 1.5.0
   *
   * @param {OrganizationMemberListQuery} [query] - The typed filters, if any.
   *
   * @return {RequestOptions['params'] | undefined} The parameter map, or undefined when nothing is filtered.
   */
  private toListParams(query?: OrganizationMemberListQuery): RequestOptions['params'] | undefined {
    if (query === undefined) return undefined;

    const params: NonNullable<RequestOptions['params']> = {
      ...(query.search ? { search: query.search } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(query.sortBy && query.sortDirection
        ? { [`order[${query.sortBy}]`]: query.sortDirection }
        : {}),
    };

    return Object.keys(params).length > 0 ? params : undefined;
  }
  //#endregion

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
   * Retrieves a paginated list of members belonging to the given organization,
   * optionally filtered and ordered. Filters from `query` are merged over
   * `options.params`, so a caller passing both wins with the typed one.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   * @param {OrganizationMemberListQuery} [query] - Optional status/role filters and ordering.
   *
   * @return {Observable<HydraCollection<OrganizationMemberOutput>>} An observable emitting the members collection.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
    query?: OrganizationMemberListQuery,
  ): Observable<HydraCollection<OrganizationMemberOutput>> {
    const url: string = `/api/organizations/${organizationId}/members`;
    const filters: RequestOptions['params'] | undefined = this.toListParams(query);
    const merged: RequestOptions | undefined =
      filters === undefined ? options : { ...options, params: { ...options?.params, ...filters } };

    return this.getCollection<OrganizationMemberOutput>(url, merged);
  }

  /**
   * Lists every member by consuming the server-paginated collection.
   */
  public listAll(
    organizationId: string,
    options?: RequestOptions,
    query?: OrganizationMemberListQuery,
  ): Observable<readonly OrganizationMemberOutput[]> {
    const pageSize = 100;
    return this.list(organizationId, { ...options, page: 1, itemsPerPage: pageSize }, query).pipe(
      expand((collection, pageIndex) =>
        (pageIndex + 1) * pageSize < collection.totalItems
          ? this.list(
              organizationId,
              { ...options, page: pageIndex + 2, itemsPerPage: pageSize },
              query,
            )
          : EMPTY,
      ),
      reduce(
        (items, collection) => [...items, ...collection.member],
        [] as readonly OrganizationMemberOutput[],
      ),
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves a single membership of the given organization.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} memberId - The ID of the membership to read.
   *
   * @return {Observable<OrganizationMemberOutput>} An observable emitting the member.
   */
  public get(organizationId: string, memberId: string): Observable<OrganizationMemberOutput> {
    const url: string = `/api/organizations/${organizationId}/members/${memberId}`;
    return this.getOne<OrganizationMemberOutput>(url);
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

  /**
   * Method reactivate
   * @method reactivate
   *
   * @description
   * Restores a deactivated membership, returning the member with `isActive`
   * flipped back on. The counterpart of {@link remove}, which deactivates
   * rather than erasing.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {string} memberId - The ID of the membership to reactivate.
   *
   * @return {Observable<OrganizationMemberOutput>} An observable emitting the reactivated member.
   */
  public reactivate(
    organizationId: string,
    memberId: string,
  ): Observable<OrganizationMemberOutput> {
    const url: string = `/api/organizations/${organizationId}/members/${memberId}/reactivate`;
    return this.postAction<OrganizationMemberOutput>(url);
  }

  /**
   * Method leave
   * @method leave
   *
   * @description
   * Removes the authenticated member's own membership. The backend refuses
   * with **409** when the caller owns the organization or is its last
   * administrator — the caller must transfer ownership or promote someone
   * else first, so a 409 here is a workflow answer rather than a fault.
   *
   * @access public
   * @since 1.5.0
   *
   * @param {string} organizationId - The ID of the organization to leave.
   *
   * @return {Observable<void>} Observable completing on success.
   */
  public leave(organizationId: string): Observable<void> {
    const url: string = `/api/organizations/${organizationId}/members/me`;
    return this.delete(url);
  }

  /**
   * Method removeMany
   * @method removeMany
   *
   * @description
   * Removes several members in one request, returning the removed and failed IDs.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} organizationId - The ID of the organization.
   * @param {ReadonlyArray<string>} memberIds - The member IDs to remove.
   *
   * @return {Observable<RemoveOrganizationMembersResult>} The batch outcome.
   */
  public removeMany(
    organizationId: string,
    memberIds: ReadonlyArray<string>,
  ): Observable<RemoveOrganizationMembersResult> {
    const url: string = `/api/organizations/${organizationId}/members/batch-remove`;
    return this.post<RemoveOrganizationMembersInput, RemoveOrganizationMembersResult>(url, {
      memberIds: [...memberIds],
    });
  }
  //#endregion
}
