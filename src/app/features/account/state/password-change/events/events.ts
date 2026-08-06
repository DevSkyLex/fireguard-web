import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant accountPasswordChangeStoreEvents
 * @const accountPasswordChangeStoreEvents
 *
 * @description
 * Outcomes of the two-step password change.
 *
 * There is no `requestSucceeded`: reaching step two already tells the user the
 * code was sent, and the screen names the address it went to. A toast on top of
 * that would repeat what is on screen.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const accountPasswordChangeStoreEvents = eventGroup({
  source: 'Account Password Change Store',
  events: {
    /** Dispatched when the current password is rejected or the code cannot be sent. */
    requestFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when the new password is in force. */
    confirmSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when the code or the new password is rejected. */
    confirmFailed: type<StoreFailureEventPayload>(),
  },
});
