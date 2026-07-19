import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { CalendarFeedOutput } from '@features/organization/features/calendar/models';

/**
 * Service CalendarService
 * @class CalendarService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for the unified calendar feed — events, inspections, interventions
 * and maintenance merged by the backend into one window.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class CalendarService extends HydraApiService {
  //#region Public Methods
  /**
   * Method getFeed
   * @method getFeed
   *
   * @description
   * Fetches every calendar entry between two instants.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization.
   * @param {string} from - Window start, ISO 8601.
   * @param {string} to - Window end, ISO 8601.
   *
   * @return {Observable<CalendarFeedOutput>} The merged feed.
   */
  public getFeed(organizationId: string, from: string, to: string): Observable<CalendarFeedOutput> {
    return this.getOne<CalendarFeedOutput>(`/api/organizations/${organizationId}/calendar/feed`, {
      params: { from, to },
    });
  }
  //#endregion
}
