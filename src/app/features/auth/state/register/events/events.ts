import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

//#region Register Store Events
/**
 * Events registerStoreEvents
 * @const registerStoreEvents
 *
 * @description
 * Event group for the `RegisterStore`. Every event carries a
 * `StoreFailureEventPayload` with contextual error information.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const registerStoreEvents = eventGroup({
  source: 'Register Store',
  events: {
    /** Emitted when the registration request fails. */
    requestFailed: type<StoreFailureEventPayload>(),

    /** Emitted when the email verification fails. */
    verifyFailed: type<StoreFailureEventPayload>(),

    /** Emitted when resending the verification code fails. */
    resendFailed: type<StoreFailureEventPayload>(),
  },
});
//#endregion
