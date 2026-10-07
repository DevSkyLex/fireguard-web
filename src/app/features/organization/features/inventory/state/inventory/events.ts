import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant inventoryEvents
 *
 * @description
 * Confirmed commands trigger sibling reads and close only the originating editor.
 */
export const inventoryEvents = eventGroup({
  source: 'Inventory',
  events: {
    saved: type<{
      readonly organizationId: string;
      readonly userId: string;
      readonly kind: string;
    }>(),
  },
});
