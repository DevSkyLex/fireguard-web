import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { MaintenancePlanOutput } from '@features/organization/features/maintenance-schedules/models';

/**
 * Constant maintenancePlansStoreEvents
 *
 * @description
 * Confirmed command consequences, carrying their original organization context.
 */
export const maintenancePlansStoreEvents = eventGroup({
  source: 'Maintenance Plans Store',
  events: {
    planPrepared: type<{ organizationId: string; plan: MaintenancePlanOutput }>(),
    planChanged: type<{ organizationId: string }>(),
  },
});
