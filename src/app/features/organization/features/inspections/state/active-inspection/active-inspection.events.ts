import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/state/request-state';

/**
 * Constant activeInspectionStoreEvents
 * @const activeInspectionStoreEvents
 *
 * @description
 * Event group for the {@link ActiveInspectionStore}. These events are dispatched
 * when root-level operations (e.g. resolving the selected inspection) fail.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const activeInspectionStoreEvents = eventGroup({
  source: 'Active Inspection Store',
  events: {
    /**
     * Event getFailed
     *
     * @description
     * Dispatched when fetching the selected inspection fails.
     */
    getFailed: type<StoreFailureEventPayload>(),
  },
});
