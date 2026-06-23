import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant activeEquipmentStoreEvents
 * @const activeEquipmentStoreEvents
 *
 * @description
 * Root-level active equipment store events for handling operation failures.
 * These events are dispatched by {@link ActiveEquipmentStore} when a
 * get operation fails.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const activeEquipmentStoreEvents = eventGroup({
  source: 'Active Equipment Store',
  events: {
    getFailed: type<StoreFailureEventPayload>(),
  },
});
