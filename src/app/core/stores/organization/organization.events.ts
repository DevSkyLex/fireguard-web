import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

/**
 * Constant organizationStoreEvents
 * @const organizationStoreEvents
 *
 * @description
 * Organization store events for handling operation failures.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const organizationStoreEvents = eventGroup({
  source: 'Organization Store',
  events: {
    listFailed: type<OperationFailureEventPayload>(),
    getFailed: type<OperationFailureEventPayload>(),
    createFailed: type<OperationFailureEventPayload>(),
    membersListFailed: type<OperationFailureEventPayload>(),
    addMemberFailed: type<OperationFailureEventPayload>(),
    rolesListFailed: type<OperationFailureEventPayload>(),
    createRoleFailed: type<OperationFailureEventPayload>(),
    invitationsListFailed: type<OperationFailureEventPayload>(),
    inviteFailed: type<OperationFailureEventPayload>(),
    revokeInvitationFailed: type<OperationFailureEventPayload>(),
    legalProfileFailed: type<OperationFailureEventPayload>(),
    upsertLegalProfileFailed: type<OperationFailureEventPayload>(),
    statisticsFailed: type<OperationFailureEventPayload>(),
  },
});
