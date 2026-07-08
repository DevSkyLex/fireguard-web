import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';
import type { InterventionOutput } from '@features/organization/features/interventions/models';

/**
 * Constant interventionStoreEvents
 * @const interventionStoreEvents
 *
 * @description
 * Component-scoped intervention store events. `created` is dispatched when an
 * intervention is created so pages can react (navigate into the workspace);
 * `listFailed` and `createFailed` are dispatched when the matching operation
 * fails so the feedback listener can surface a toast.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionStoreEvents = eventGroup({
  source: 'Intervention Store',
  events: {
    created: type<InterventionOutput>(),
    listFailed: type<StoreFailureEventPayload>(),
    createFailed: type<StoreFailureEventPayload>(),
  },
});
