import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

/**
 * Constant activeOrganizationStoreEvents
 * @const activeOrganizationStoreEvents
 *
 * @description
 * Root-level active organization store events for handling operation failures.
 * These events are dispatched by {@link ActiveOrganizationStore} when a
 * get or statistics operation fails.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const activeOrganizationStoreEvents = eventGroup({
  source: 'Active Organization Store',
  events: {
    getFailed: type<OperationFailureEventPayload>(),
    statisticsFailed: type<OperationFailureEventPayload>(),
  },
});
