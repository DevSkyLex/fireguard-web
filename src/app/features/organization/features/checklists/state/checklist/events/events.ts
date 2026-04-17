import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/state/request-state';

/**
 * Constant checklistStoreEvents
 * @const checklistStoreEvents
 *
 * @description
 * Component-scoped checklist store events for handling operation failures.
 * These events are dispatched by {@link ChecklistStore} when a list,
 * create, or archive operation fails.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const checklistStoreEvents = eventGroup({
  source: 'Checklist Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
    createFailed: type<StoreFailureEventPayload>(),
    archiveFailed: type<StoreFailureEventPayload>(),
  },
});
