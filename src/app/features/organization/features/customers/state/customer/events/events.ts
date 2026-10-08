import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant customerStoreEvents
 *
 * @description
 * Confirmed mutations invalidate directory consumers and dismiss successful editors.
 *
 * @since unreleased
 */
export const customerStoreEvents = eventGroup({
  source: 'Customer Store',
  events: {
    saved: type<{ readonly organizationId: string; readonly customerId: string }>(),
  },
});
