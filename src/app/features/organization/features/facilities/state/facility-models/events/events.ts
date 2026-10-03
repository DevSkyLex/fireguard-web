import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityModelsStoreEvents
 *
 * @description
 * Reports failures and successful model mutations to page-level consumers.
 */
export const facilityModelsStoreEvents = eventGroup({
  source: 'Facility Models Store',
  events: {
    failed: type<StoreFailureEventPayload>(),
    changed: type<{ readonly buildingId: string; readonly modelId: string }>(),
  },
});
