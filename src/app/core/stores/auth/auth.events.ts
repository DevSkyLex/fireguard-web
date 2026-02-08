import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

/**
 * Constant authStoreEvents
 * @const authStoreEvents
 *
 * @description
 * Authentication store events for handling login
 * and MFA operation failures.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const authStoreEvents = eventGroup({
  source: 'Auth Store',
  events: {
    loginFailed: type<OperationFailureEventPayload>(),
    mfaVerifyFailed: type<OperationFailureEventPayload>(),
    mfaResendFailed: type<OperationFailureEventPayload>(),
  },
});
