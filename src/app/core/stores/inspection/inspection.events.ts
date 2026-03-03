import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

export const inspectionStoreEvents = eventGroup({
  source: 'Inspection Store',
  events: {
    listFailed: type<OperationFailureEventPayload>(),
    getFailed: type<OperationFailureEventPayload>(),
    createFailed: type<OperationFailureEventPayload>(),
    submitFailed: type<OperationFailureEventPayload>(),
    closeFailed: type<OperationFailureEventPayload>(),
    nonConformitiesListFailed: type<OperationFailureEventPayload>(),
    addNonConformityFailed: type<OperationFailureEventPayload>(),
    updateNonConformityStatusFailed: type<OperationFailureEventPayload>(),
  },
});
