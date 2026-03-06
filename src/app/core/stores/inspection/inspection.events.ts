import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

export const inspectionStoreEvents = eventGroup({
  source: 'Inspection Store',
  events: {
    /** Dispatched when fetching the inspection list fails. */
    listFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when creating an inspection fails. */
    createFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when submitting an inspection fails. */
    submitFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when closing an inspection fails. */
    closeFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when loading non-conformities fails. */
    nonConformitiesListFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when adding a non-conformity fails. */
    addNonConformityFailed: type<OperationFailureEventPayload>(),
    /** Dispatched when updating non-conformity status fails. */
    updateNonConformityStatusFailed: type<OperationFailureEventPayload>(),
  },
});
