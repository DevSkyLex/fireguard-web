import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant savedMessagesStoreEvents
 * @const savedMessagesStoreEvents
 *
 * @description
 * Notable {@link SavedMessagesStore} transitions other layers react to.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const savedMessagesStoreEvents = eventGroup({
  source: 'Saved Messages Store',
  events: {
    loadFailed: type<StoreFailureEventPayload>(),
    interactionFailed: type<StoreFailureEventPayload>(),
  },
});
