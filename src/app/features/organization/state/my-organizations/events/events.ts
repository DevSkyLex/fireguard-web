import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant myOrganizationsStoreEvents
 * @const myOrganizationsStoreEvents
 *
 * @description
 * Root-provided `MyOrganizationsStore` events, dispatched on a failed list
 * load or a failed `leave` mutation so the app-wide feedback listener can
 * raise a toast.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const myOrganizationsStoreEvents = eventGroup({
  source: 'My Organizations Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
    leaveFailed: type<StoreFailureEventPayload>(),
    leaveSucceeded: type<{ readonly organizationId: string }>(),
  },
});
