import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

export const auditStoreEvents = eventGroup({
  source: 'Audit Store',
  events: {
    listFailed: type<OperationFailureEventPayload>(),
  },
});
