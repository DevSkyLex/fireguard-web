import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type {
  CalendarEventOutput,
  CreateCalendarEventInput,
} from '@features/organization/features/calendar/models';

/**
 * Service CalendarEventService
 * @class CalendarEventService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for the standalone organization calendar event resource
 * (`/organizations/{organizationId}/calendar/events`). Distinct from
 * {@link CalendarService}, which reads the read-only, merged feed.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class CalendarEventService extends HydraApiService {
  //#region Properties
  /**
   * Property BASE_PATH
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/organizations';
  //#endregion

  //#region Public Methods
  /**
   * Method create
   * @method create
   *
   * @description
   * Creates a standalone calendar event for the organization. Requires
   * `organization.events.write`.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization.
   * @param {CreateCalendarEventInput} input - The event fields.
   *
   * @return {Observable<CalendarEventOutput>} The created event.
   */
  public create(
    organizationId: string,
    input: CreateCalendarEventInput,
  ): Observable<CalendarEventOutput> {
    return this.post<CreateCalendarEventInput, CalendarEventOutput>(
      `${CalendarEventService.BASE_PATH}/${organizationId}/calendar/events`,
      input,
    );
  }
  //#endregion
}
