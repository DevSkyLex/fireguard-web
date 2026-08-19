import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type { TeamOutput } from '@features/organization/models';

/**
 * Service TeamService
 * @class TeamService
 * @extends {HydraApiService}
 *
 * @description
 * Read-side API service for organization teams. Only `list` exists today —
 * the interventions feature's team-assignment picker is its sole consumer;
 * team CRUD itself has no frontend surface yet.
 *
 * @version 1.0.0
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
  //#endregion
}
