import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

export const equipmentStoreEvents = eventGroup({
  source: 'Equipment Store',
  events: {
    listFailed: type<OperationFailureEventPayload>(),
    getFailed: type<OperationFailureEventPayload>(),
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
