import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/state/request-state';

/**
 * Constant organizationStoreEvents
 * @const organizationStoreEvents
 *
 * @description
 * Component-scoped organization store events for handling operation failures.
 * These events are dispatched by {@link OrganizationStore} when a list,
 * create, or delete operation fails.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const organizationStoreEvents = eventGroup({
  source: 'Organization Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
    createFailed: type<StoreFailureEventPayload>(),
    deleteFailed: type<StoreFailureEventPayload>(),
    deleteManyFailed: type<StoreFailureEventPayload>(),
  },
});
