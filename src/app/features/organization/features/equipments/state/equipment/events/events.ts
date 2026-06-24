import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant equipmentStoreEvents
 * @const equipmentStoreEvents
 *
 * @description
 * Component-scoped equipment store events for handling operation failures.
 * These events are dispatched by {@link EquipmentStore} when a list,
 * create, update, lifecycle, attachment, or tag operation fails.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const equipmentStoreEvents = eventGroup({
  source: 'Equipment Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
    createFailed: type<StoreFailureEventPayload>(),
    createSucceeded: type<FeedbackEventPayload>(),
    updateFailed: type<StoreFailureEventPayload>(),
    assignToFacilityFailed: type<StoreFailureEventPayload>(),
    unassignFromFacilityFailed: type<StoreFailureEventPayload>(),
    commissionFailed: type<StoreFailureEventPayload>(),
    decommissionFailed: type<StoreFailureEventPayload>(),
    maintenanceFailed: type<StoreFailureEventPayload>(),
    attachmentsListFailed: type<StoreFailureEventPayload>(),
    addAttachmentFailed: type<StoreFailureEventPayload>(),
    deleteAttachmentFailed: type<StoreFailureEventPayload>(),
    tagsListFailed: type<StoreFailureEventPayload>(),
    addTagFailed: type<StoreFailureEventPayload>(),
    removeTagFailed: type<StoreFailureEventPayload>(),
  },
});
