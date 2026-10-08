import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant equipmentTypeAdministrationEvents
 *
 * @description
 * Confirmed catalogue writes dismiss editors without discarding rejected drafts.
 */
export const equipmentTypeAdministrationEvents = eventGroup({
  source: 'Equipment Type Administration',
  events: { saved: type<{ readonly organizationId: string; readonly value: string }>() },
});
