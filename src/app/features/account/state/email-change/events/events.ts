import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant accountEmailChangeStoreEvents
 * @const accountEmailChangeStoreEvents
 *
 * @description
 * Outcomes of the sign-in email change request workflow.
 *
 * Only the failures raise a toast: an accepted request swaps the section to
 * its "link sent" panel naming the address, and a cancellation swaps it back
 * to the form — both outcomes are already on screen where the user is
 * looking, so a toast on top would repeat them. The failure messages carry
 * the backend's neutral RFC 7807 detail when there is one (a wrong password,
 * the neutral "This email address cannot be used.", a rate limit), through
 * `toStoreFailureEventPayload`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const accountEmailChangeStoreEvents = eventGroup({
  source: 'Account Email Change Store',
  events: {
    /** Dispatched when the email change request is rejected. */
    requestFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when the pending request could not be cancelled. */
    cancelFailed: type<StoreFailureEventPayload>(),
  },
});
