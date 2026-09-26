import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant presencePreferenceStoreEvents
 * @const presencePreferenceStoreEvents
 * @description Explicit save failures for application feedback; background refreshes stay silent.
 * @since 1.0.0
 */
export const presencePreferenceStoreEvents = eventGroup({
  source: 'Presence Preference Store',
  events: {
    saveFailed: type<StoreFailureEventPayload>(),
  },
});
