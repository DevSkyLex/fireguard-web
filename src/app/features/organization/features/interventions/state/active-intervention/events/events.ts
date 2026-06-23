import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant activeInterventionStoreEvents
 * @const activeInterventionStoreEvents
 *
 * @description
 * Event group for the {@link ActiveInterventionStore}. These events are
 * dispatched when root-level operations (e.g. resolving the selected
 * intervention) fail.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const activeInterventionStoreEvents = eventGroup({
  source: 'Active Intervention Store',
  events: {
    /**
     * Event getFailed
     *
     * @description
     * Dispatched when fetching the selected intervention fails.
     */
    getFailed: type<StoreFailureEventPayload>(),
  },
});
