import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

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
    loginFailed: type<StoreFailureEventPayload>(),
    logoutSucceeded: type<void>(),
    logoutFailed: type<StoreFailureEventPayload>(),
    /**
     * The local session is over, whatever the server answered.
     *
     * `logoutSucceeded` and `logoutFailed` report the *outcome of the call* and
     * exist for navigation and toasts. But the store drops the session locally on
     * both branches, so a listener that only watches `logoutSucceeded` keeps the
     * previous user's data alive whenever the logout request fails — a plain
     * network error is enough. Anything that has to be purged when a user leaves
     * (stores holding personal data, offline databases) must listen to this event
     * instead, which is dispatched on both paths.
     */
    sessionEnded: type<void>(),
    mfaVerifyFailed: type<StoreFailureEventPayload>(),
    mfaResendFailed: type<StoreFailureEventPayload>(),
  },
});
