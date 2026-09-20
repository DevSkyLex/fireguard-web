import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { InterventionTimeScope } from '@features/organization/features/interventions/models';

/**
 * Constant interventionTimeEvents
 * @const interventionTimeEvents
 *
 * @description
 * Journal writes refresh spent totals without changing the operational revision.
 *
 * @since 1.0.0
 */
export const interventionTimeEvents = eventGroup({
  source: 'Intervention Time',
  events: {
    written: type<{
      readonly scope: InterventionTimeScope;
      readonly source: 'queued' | 'remote';
    }>(),
  },
});
