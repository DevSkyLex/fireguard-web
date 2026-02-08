import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

/**
 * Constant trustedDeviceStoreEvents
 * @const trustedDeviceStoreEvents
 *
 * @description
 * Trusted device store events for handling device
 * operation failures.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const trustedDeviceStoreEvents = eventGroup({
  source: 'Trusted Device Store',
  events: {
    loadFailed: type<OperationFailureEventPayload>(),
    trustFailed: type<OperationFailureEventPayload>(),
    revokeFailed: type<OperationFailureEventPayload>(),
    revokeAllFailed: type<OperationFailureEventPayload>(),
  },
});
