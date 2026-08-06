import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant accountProfileEditStoreEvents
 * @const accountProfileEditStoreEvents
 *
 * @description
 * Outcomes of the two profile mutations. Both are dispatched purely so the
 * app-wide feedback listener can raise a toast: the page shows no error surface
 * of its own, because a rejected save is a whole-request failure rather than a
 * field problem (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const accountProfileEditStoreEvents = eventGroup({
  source: 'Account Profile Edit Store',
  events: {
    /** Dispatched when the profile fields are persisted. */
    saveSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when persisting the profile fields fails. */
    saveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a new avatar is stored. */
    avatarUploadSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when uploading the avatar fails. */
    avatarUploadFailed: type<StoreFailureEventPayload>(),
  },
});
