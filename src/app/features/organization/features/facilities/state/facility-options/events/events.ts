import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityOptionsStoreEvents
 * @description
 * Events the FacilityOptionsStore emits: one failure event, so the page can
 * toast it while the picker simply stays empty.
 * @since 1.0.0
 */
export const facilityOptionsStoreEvents = eventGroup({
  source: 'Facility Options Store',
  events: {
    loadFailed: type<StoreFailureEventPayload>(),
  },
});
