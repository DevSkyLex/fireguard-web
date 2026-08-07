import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';
import type { InterventionOutput } from '@features/organization/features/interventions/models';

/**
 * Constant interventionStoreEvents
 * @const interventionStoreEvents
 *
 * @description
 * Component-scoped intervention store events. `created` is dispatched when an
 * intervention is created so pages can react (navigate into the workspace);
 * `listFailed`, `createFailed`, `transitionFailed` and `deleteFailed` are
 * dispatched when the matching operation fails so the feedback listener can
 * surface a toast; `deleteSucceeded` confirms a deletion the same way.
 *
 * @version 4.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionStoreEvents = eventGroup({
  source: 'Intervention Store',
  events: {
    created: type<InterventionOutput>(),
    listFailed: type<StoreFailureEventPayload>(),
    createFailed: type<StoreFailureEventPayload>(),
    transitionFailed: type<StoreFailureEventPayload>(),
    deleteSucceeded: type<FeedbackEventPayload>(),
    deleteFailed: type<StoreFailureEventPayload>(),
  },
});
