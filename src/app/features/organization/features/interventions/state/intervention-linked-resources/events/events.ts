import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant interventionLinkedResourcesStoreEvents
 * @const interventionLinkedResourcesStoreEvents
 *
 * @description
 * Component-scoped linked-resources store events, one per tab, dispatched
 * when its fetch fails so the app-wide feedback listener can surface a toast
 * rather than leaving the tab silently empty.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionLinkedResourcesStoreEvents = eventGroup({
  source: 'Intervention Linked Resources Store',
  events: {
    facilitiesLoadFailed: type<StoreFailureEventPayload>(),
    equipmentLoadFailed: type<StoreFailureEventPayload>(),
    inspectionsLoadFailed: type<StoreFailureEventPayload>(),
  },
});
