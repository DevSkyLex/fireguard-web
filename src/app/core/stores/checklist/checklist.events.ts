import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

export const checklistStoreEvents = eventGroup({
  source: 'Checklist Store',
  events: {
    listFailed: type<OperationFailureEventPayload>(),
    getFailed: type<OperationFailureEventPayload>(),
    createFailed: type<OperationFailureEventPayload>(),
    archiveFailed: type<OperationFailureEventPayload>(),
  },
});
