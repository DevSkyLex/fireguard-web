import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant inspectionCreationOptionsStoreEvents
 * @const inspectionCreationOptionsStoreEvents
 *
 * @description
 * Component-scoped creation-options store events dispatched when loading the
 * equipment selector options fails, so the app-wide feedback listener can
 * surface a toast rather than leaving the combobox silently empty.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const inspectionCreationOptionsStoreEvents = eventGroup({
  source: 'Inspection Creation Options Store',
  events: {
    loadFailed: type<StoreFailureEventPayload>(),
  },
});
