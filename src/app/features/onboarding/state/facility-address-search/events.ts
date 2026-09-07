import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload } from '@core/request-state';

/**
 * Events facilityAddressSearchEvents
 * @const facilityAddressSearchEvents
 * @description Emits one toast when an address lookup fails, while retaining a retryable query state.
 * @since 1.0.0
 */
export const facilityAddressSearchEvents = eventGroup({
  source: 'Facility Address Search',
  events: { failed: type<FeedbackEventPayload>() },
});
