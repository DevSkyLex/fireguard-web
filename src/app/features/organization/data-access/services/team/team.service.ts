import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  TeamOutput,
  TeamMemberOutput,
  CreateTeamInput,
  UpdateTeamInput,
  AddTeamMemberInput,
} from '@features/organization/models';

/**
 * Service TeamService
 * @class TeamService
 * @extends {HydraApiService}
 *
 * @description
 * API service for organization team management: listing, reading, creating,
 * renaming, and deleting teams, and managing their member rosters. Mirrors
 * `OrganizationRoleService`'s endpoint and permission shape.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class TeamService extends HydraApiService {
  //#region Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Lists the teams defined for one organization. Requires
   * `organization.teams.read`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The owning organization's id.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<TeamOutput>>} Result of the list operation.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<TeamOutput>> {
    return this.getCollection<TeamOutput>(`/api/organizations/${organizationId}/teams`, options);
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves a single team by id. Requires `organization.teams.read`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization's id.
   * @param {string} teamId - The id of the team to read.
   *
   * @return {Observable<TeamOutput>} An observable emitting the team.
   */
  public get(organizationId: string, teamId: string): Observable<TeamOutput> {
    return this.getOne<TeamOutput>(`/api/organizations/${organizationId}/teams/${teamId}`);
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a team inside the given organization. Requires
   * `organization.teams.write`; the backend answers **409** for a duplicate
   * name within the organization.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization's id.
   * @param {CreateTeamInput} input - The data required to create the team.
   *
   * @return {Observable<TeamOutput>} An observable emitting the created team.
   */
  public create(organizationId: string, input: CreateTeamInput): Observable<TeamOutput> {
    return this.post<CreateTeamInput, TeamOutput>(
      `/api/organizations/${organizationId}/teams`,
      input,
    );
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Renames or redescribes a team using a partial merge-patch. Only the
   * fields included in the input are modified. Requires
   * `organization.teams.write`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization's id.
   * @param {string} teamId - The id of the team to update.
   * @param {UpdateTeamInput} input - The partial data to apply to the team.
   *
   * @return {Observable<TeamOutput>} An observable emitting the updated team.
   */
  public update(
    organizationId: string,
    teamId: string,
    input: UpdateTeamInput,
  ): Observable<TeamOutput> {
    return this.patch<UpdateTeamInput, TeamOutput>(
      `/api/organizations/${organizationId}/teams/${teamId}`,
      input,
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Permanently deletes a team; all team member assignments are removed
   * with it. Requires `organization.teams.manage`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization's id.
   * @param {string} teamId - The id of the team to delete.
   *
   * @return {Observable<void>} Observable completing on success.
   */
  public remove(organizationId: string, teamId: string): Observable<void> {
    return this.delete(`/api/organizations/${organizationId}/teams/${teamId}`);
  }

  /**
   * Method listMembers
   * @method listMembers
   *
   * @description
   * Lists the members assigned to a team. Requires `organization.teams.read`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization's id.
   * @param {string} teamId - The id of the team.
   * @param {RequestOptions} [options] - Optional pagination parameters.
   *
   * @return {Observable<HydraCollection<TeamMemberOutput>>} Result of the list operation.
   */
  public listMembers(
    organizationId: string,
    teamId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<TeamMemberOutput>> {
    return this.getCollection<TeamMemberOutput>(
      `/api/organizations/${organizationId}/teams/${teamId}/members`,
      options,
    );
  }

  /**
   * Method addMember
   * @method addMember
   *
   * @description
   * Adds an active organization member to a team. Requires
   * `organization.teams.write`; the backend answers **400** when the member
   * is not active in the organization or already belongs to the team.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization's id.
   * @param {string} teamId - The id of the team.
   * @param {AddTeamMemberInput} input - The member to add, and its optional membership label.
   *
   * @return {Observable<TeamMemberOutput>} An observable emitting the created membership row.
   */
  public addMember(
    organizationId: string,
    teamId: string,
    input: AddTeamMemberInput,
  ): Observable<TeamMemberOutput> {
    return this.post<AddTeamMemberInput, TeamMemberOutput>(
      `/api/organizations/${organizationId}/teams/${teamId}/members`,
      input,
    );
  }

  /**
   * Method removeMember
   * @method removeMember
   *
   * @description
   * Removes a member from a team. Requires `organization.teams.write`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization's id.
   * @param {string} teamId - The id of the team.
   * @param {string} memberId - The id of the member to remove from the team.
   *
   * @return {Observable<void>} Observable completing on success.
   */
  public removeMember(organizationId: string, teamId: string, memberId: string): Observable<void> {
    return this.delete(`/api/organizations/${organizationId}/teams/${teamId}/members/${memberId}`);
  }
  //#endregion
}
