import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityBuilding3dStoreEvents
 * @const facilityBuilding3dStoreEvents
 *
 * @description
 * Facility building 3D store failure events, picked up by the app-wide
 * feedback listener and rendered as a toast.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const facilityBuilding3dStoreEvents = eventGroup({
  source: 'Facility Building 3D Store',
  events: {
    /** Dispatched when loading the building model fails. */
    modelLoadFailed: type<StoreFailureEventPayload>(),
  },
});
