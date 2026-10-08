import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload } from '@core/request-state';
import type { MaintenanceCostCommand } from '@features/organization/features/maintenance-costs/models';

/**
 * Constant maintenanceCostStoreEvents
 *
 * @description
 * Confirmed private writes let the page reset only the acknowledged draft.
 */
export const maintenanceCostStoreEvents = eventGroup({
  source: 'Maintenance Cost Store',
  events: {
    feedback: type<FeedbackEventPayload>(),
    saved: type<{
      readonly organizationId: string;
      readonly kind: MaintenanceCostCommand['kind'];
    }>(),
  },
});
