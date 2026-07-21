import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { OrganizationNavigationCountersOutput } from '@features/organization/models';

/**
 * Service NavigationCountersService
 * @class NavigationCountersService
 * @extends {HydraApiService}
 *
 * @description
 * API service for the sidebar navigation badge counters. Kept separate from
 * {@link OrganizationService} so the shell-facing concern stays a small,
 * independent transport surface.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationCountersService extends HydraApiService {
  //#region Constants
  /**
   * Property BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base API path for organization endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/organizations';
  //#endregion

  //#region Methods
  /**
   * Method getCounters
   * @method getCounters
   *
   * @description
   * Loads the organization's navigation badge counters.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Active organization identifier.
   *
   * @returns {Observable<OrganizationNavigationCountersOutput>} Counter payload.
   */
  public getCounters(organizationId: string): Observable<OrganizationNavigationCountersOutput> {
    return this.getOne<OrganizationNavigationCountersOutput>(
      `${NavigationCountersService.BASE_PATH}/${organizationId}/navigation-counters`,
    );
  }
  //#endregion
}
