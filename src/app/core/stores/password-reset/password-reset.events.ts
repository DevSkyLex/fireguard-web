import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

/**
 * Constant passwordResetStoreEvents
 *
 * @description
 * Password reset store domain events.
 */
export const passwordResetStoreEvents = eventGroup({
  source: 'Password Reset Store',
  events: {
    requestFailed: type<OperationFailureEventPayload>(),
    confirmFailed: type<OperationFailureEventPayload>(),
    resendFailed: type<OperationFailureEventPayload>(),
  },
});
