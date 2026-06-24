import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

export const inspectionStoreEvents = eventGroup({
  source: 'Inspection Store',
  events: {
    /** Dispatched when fetching the inspection list fails. */
    listFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when creating an inspection fails (non-quota errors only). */
    createFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when an inspection is created. */
    createSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when updating an inspection fails. */
    updateFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when cancelling an inspection fails. */
    cancelFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when submitting an inspection fails. */
    submitFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when closing an inspection fails. */
    closeFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when loading non-conformities fails. */
    nonConformitiesListFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when loading one non-conformity fails. */
    nonConformityGetFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when adding a non-conformity fails. */
    addNonConformityFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when updating non-conformity status fails. */
    updateNonConformityStatusFailed: type<StoreFailureEventPayload>(),
  },
});
