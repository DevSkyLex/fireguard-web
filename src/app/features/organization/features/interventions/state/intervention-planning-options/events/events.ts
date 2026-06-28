import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant interventionPlanningOptionsStoreEvents
 * @const interventionPlanningOptionsStoreEvents
 *
 * @description
 * Component-scoped planning-options store events dispatched when loading the
 * site / target / member selector options fails, so the app-wide feedback
 * listener can surface a toast rather than leaving the planning selects
 * silently empty.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionPlanningOptionsStoreEvents = eventGroup({
  source: 'Intervention Planning Options Store',
  events: {
    loadFailed: type<StoreFailureEventPayload>(),
  },
});
