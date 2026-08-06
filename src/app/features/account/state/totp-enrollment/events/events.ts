import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant accountTotpEnrollmentStoreEvents
 * @const accountTotpEnrollmentStoreEvents
 *
 * @description
 * Outcomes of the authenticator-app enrollment lifecycle.
 *
 * There is no `setupSucceeded`: a generated secret is not an accomplishment,
 * it is the middle of a step, and the key appears on screen the moment it
 * arrives.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const accountTotpEnrollmentStoreEvents = eventGroup({
  source: 'Account Totp Enrollment Store',
  events: {
    /** Dispatched when a pending secret cannot be generated. */
    setupFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when two-factor authentication becomes active. */
    confirmSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when the activation code is rejected. */
    confirmFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when two-factor authentication is switched off. */
    disableSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when the code proving possession is rejected. */
    disableFailed: type<StoreFailureEventPayload>(),
  },
});
