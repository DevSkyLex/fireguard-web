import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant passwordResetStoreEvents
 *
 * @description
 * Password reset store domain events.
 */
export const passwordResetStoreEvents = eventGroup({
  source: 'Password Reset Store',
  events: {
    requestFailed: type<{ message: string }>(),
    confirmFailed: type<{ message: string }>(),
    resendFailed: type<{ message: string }>(),
  },
});
