import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant accountDeactivationStoreEvents
 * @const accountDeactivationStoreEvents
 *
 * @description
 * Outcomes of the self-service account deactivation.
 *
 * The success event carries a feedback payload on purpose: the page purges the
 * local session and leaves for the login screen immediately, so the toast is
 * the only confirmation the user ever sees of what just happened.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const accountDeactivationStoreEvents = eventGroup({
  source: 'Account Deactivation Store',
  events: {
    /** Dispatched when the account has been deactivated and every session revoked. */
    deactivateSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when the deactivation request is rejected. */
    deactivateFailed: type<StoreFailureEventPayload>(),
  },
});
