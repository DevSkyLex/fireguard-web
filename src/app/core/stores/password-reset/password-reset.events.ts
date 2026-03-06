import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

//#region Password Reset Store Events
/**
 * Events passwordResetStoreEvents
 * @const passwordResetStoreEvents
 *
 * @description
 * Event group for the `PasswordResetStore`. Every event carries an
 * `OperationFailureEventPayload` with contextual error information.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const passwordResetStoreEvents = eventGroup({
  source: 'Password Reset Store',
  events: {
    /** Emitted when the password reset request fails. */
    requestFailed: type<OperationFailureEventPayload>(),

    /** Emitted when the password reset confirmation fails. */
    confirmFailed: type<OperationFailureEventPayload>(),

    /** Emitted when resending the verification code fails. */
    resendFailed: type<OperationFailureEventPayload>(),
  },
});
//#endregion
