import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant activeChecklistStoreEvents
 * @const activeChecklistStoreEvents
 *
 * @description
 * Root-level active checklist store events for handling operation failures.
 * These events are dispatched by {@link ActiveChecklistStore} when a
 * get operation fails.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const activeChecklistStoreEvents = eventGroup({
  source: 'Active Checklist Store',
  events: {
    getFailed: type<StoreFailureEventPayload>(),
  },
});
