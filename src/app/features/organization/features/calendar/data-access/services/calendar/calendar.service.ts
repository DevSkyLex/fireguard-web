import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { CalendarFeedOutput } from '@features/organization/features/calendar/models';

/**
 * Service CalendarService
 * @class CalendarService
 *
 * @description
 * Transport for the organization calendar: the unified, date-ranged feed the
 * backend merges from standalone events, inspections, interventions and
 * preventive maintenance. Read-only in this pass — the standalone-event CRUD
 * is a follow-up surface.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class CalendarService extends HydraApiService {
  /**
   * Method getFeed
   * @method getFeed
   *
   * @description
   * Reads the unified feed for one inclusive date window.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - organization Id value.
   * @param {string} from - inclusive ISO lower bound.
   * @param {string} to - inclusive ISO upper bound.
   *
   * @return {Observable<CalendarFeedOutput>} The merged feed.
   */
  public getFeed(organizationId: string, from: string, to: string): Observable<CalendarFeedOutput> {
    return this.getOne<CalendarFeedOutput>(`/api/organizations/${organizationId}/calendar/feed`, {
      params: { from, to },
    });
  }
}
