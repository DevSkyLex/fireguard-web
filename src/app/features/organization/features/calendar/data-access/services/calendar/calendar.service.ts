import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type ApiRequestOptions } from '@core/api';
import type {
  CalendarEventOutput,
  CalendarFeedOutput,
  CalendarFeedTokenOutput,
  CalendarFeedTokenSecretOutput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@features/organization/features/calendar/models';

/**
 * Service CalendarService
 * @class CalendarService
 *
 * @description
 * Transport for the organization calendar: the unified, date-ranged feed the
 * backend merges from standalone events, inspections, interventions and
 * preventive maintenance, plus full CRUD on the standalone events
 * themselves. `updateEvent` sends a merge-patch body — the caller passes
 * only the fields that changed, since an omitted field is left unchanged
 * server-side while an explicit `null` clears `description`, `endsAt` or
 * `facilityId` (`Calendar\MODULE.md`). Also carries the member's iCal feed
 * token lifecycle: `createFeedToken` returns the raw secret and full feed
 * URL for one write intention (creating rotates any prior token), `getFeedTokenMetadata`
 * reads secret-less metadata (404 while none exists), `revokeFeedToken`
 * kills the active link.
 *
 * @version 1.2.0
 *
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
   * @returns {Observable<CalendarFeedOutput>} The merged feed.
   */
  public getFeed(organizationId: string, from: string, to: string): Observable<CalendarFeedOutput> {
    return this.getOne<CalendarFeedOutput>(`/api/organizations/${organizationId}/calendar/feed`, {
      params: { from, to },
    });
  }

  /**
   * Method createEvent
   * @method createEvent
   *
   * @description
   * Creates a standalone calendar event.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {CreateCalendarEventInput} input - The event to create.
   *
   * @returns {Observable<CalendarEventOutput>} The created event.
   */
  public createEvent(
    organizationId: string,
    input: CreateCalendarEventInput,
  ): Observable<CalendarEventOutput> {
    return this.post<CreateCalendarEventInput, CalendarEventOutput>(
      `/api/organizations/${organizationId}/calendar/events`,
      input,
    );
  }

  /**
   * Method updateEvent
   * @method updateEvent
   *
   * @description
   * Merge-patches a standalone calendar event with only the fields the
   * caller passes — see the class doc for the omitted-vs-`null` semantics.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} eventId - The event to update.
   * @param {UpdateCalendarEventInput} input - The dirty fields only.
   *
   * @returns {Observable<CalendarEventOutput>} The updated event.
   */
  public updateEvent(
    organizationId: string,
    eventId: string,
    input: UpdateCalendarEventInput,
  ): Observable<CalendarEventOutput> {
    return this.patch<UpdateCalendarEventInput, CalendarEventOutput>(
      `/api/organizations/${organizationId}/calendar/events/${eventId}`,
      input,
    );
  }

  /**
   * Method deleteEvent
   * @method deleteEvent
   *
   * @description
   * Deletes a standalone calendar event.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} eventId - The event to delete.
   *
   * @returns {Observable<void>} Completes on success.
   */
  public deleteEvent(organizationId: string, eventId: string): Observable<void> {
    return this.delete(`/api/organizations/${organizationId}/calendar/events/${eventId}`);
  }

  /**
   * Method createFeedToken
   * @method createFeedToken
   *
   * @description
   * Creates — or rotates, revoking the previous one — the member's iCal feed
   * token. Its response carries the raw secret and complete feed URL; the same write identity
   * can replay that original payload during the server's secure display period.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {ApiRequestOptions} [options] - The caller-owned identity retained for an unchanged
   *   retry.
   *
   * @returns {Observable<CalendarFeedTokenSecretOutput>} The original secret payload.
   */
  public createFeedToken(
    organizationId: string,
    options?: ApiRequestOptions,
  ): Observable<CalendarFeedTokenSecretOutput> {
    return this.postAction<CalendarFeedTokenSecretOutput>(
      `/api/organizations/${organizationId}/calendar/feed-token`,
      options,
    );
  }

  /**
   * Method getFeedTokenMetadata
   * @method getFeedTokenMetadata
   *
   * @description
   * Reads the active feed token's secret-less metadata. A 404 means the
   * member holds no token for this organization.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} organizationId - The owning organization.
   *
   * @returns {Observable<CalendarFeedTokenOutput>} The token metadata.
   */
  public getFeedTokenMetadata(organizationId: string): Observable<CalendarFeedTokenOutput> {
    return this.getOne<CalendarFeedTokenOutput>(
      `/api/organizations/${organizationId}/calendar/feed-token`,
    );
  }

  /**
   * Method revokeFeedToken
   * @method revokeFeedToken
   *
   * @description
   * Revokes the member's active feed token — the subscribed link stops
   * working immediately.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {ApiRequestOptions} [options] - The caller-owned identity retained for an unchanged
   *   retry.
   *
   * @returns {Observable<void>} Completes on success.
   */
  public revokeFeedToken(organizationId: string, options?: ApiRequestOptions): Observable<void> {
    return this.delete(`/api/organizations/${organizationId}/calendar/feed-token`, options);
  }
}
