import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant workloadStoreEvents
 * @const workloadStoreEvents
 *
 * @description
 * Capacity completion invalidates other open workload consumers.
 *
 * @since 1.0.0
 */
export const workloadStoreEvents = eventGroup({
  source: 'Workload Store',
  events: {
    capacitySaved: type<{ readonly organizationId: string; readonly memberId: string | null }>(),
  },
});
