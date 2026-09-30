import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant workloadStoreEvents
 *
 * @description
 * Capacity completion invalidates other open workload consumers.
 *
 * @since 1.0.0
 *
 * @constant workloadStoreEvents
 */
export const workloadStoreEvents = eventGroup({
  source: 'Workload Store',
  events: {
    capacitySaved: type<{ readonly organizationId: string; readonly memberId: string | null }>(),
  },
});
