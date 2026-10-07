import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type {
  ProcurementCommand,
  ProcurementMutationOutput,
} from '../models/procurement-command.type';

/**
 * Constant procurementStoreEvents
 *
 * @description
 * Confirmed write consequences; subscribers must match the original organization.
 */
export const procurementStoreEvents = eventGroup({
  source: 'Procurement Store',
  events: {
    saved: type<{
      organizationId: string;
      command: ProcurementCommand;
      result: ProcurementMutationOutput;
    }>(),
  },
});
