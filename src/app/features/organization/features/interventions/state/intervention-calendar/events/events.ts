import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant interventionCalendarStoreEvents
 * @const interventionCalendarStoreEvents
 *
 * @description
 * Component-scoped calendar store events dispatched when the organization
 * intervention calendar load fails, so the app-wide feedback listener can
 * surface a toast instead of leaving the calendar silently empty.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionCalendarStoreEvents = eventGroup({
  source: 'Intervention Calendar Store',
  events: {
    loadFailed: type<StoreFailureEventPayload>(),
  },
});
