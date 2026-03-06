import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

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
    listFailed: type<OperationFailureEventPayload>(),
    createFailed: type<OperationFailureEventPayload>(),
    updateFailed: type<OperationFailureEventPayload>(),
    assignToFacilityFailed: type<OperationFailureEventPayload>(),
    unassignFromFacilityFailed: type<OperationFailureEventPayload>(),
    commissionFailed: type<OperationFailureEventPayload>(),
    decommissionFailed: type<OperationFailureEventPayload>(),
    maintenanceFailed: type<OperationFailureEventPayload>(),
    attachmentsListFailed: type<OperationFailureEventPayload>(),
    addAttachmentFailed: type<OperationFailureEventPayload>(),
    deleteAttachmentFailed: type<OperationFailureEventPayload>(),
    addTagFailed: type<OperationFailureEventPayload>(),
    removeTagFailed: type<OperationFailureEventPayload>(),
  },
});
