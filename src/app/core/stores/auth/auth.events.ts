import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant authStoreEvents
 *
 * @description
 * Auth store domain events.
 */
export const authStoreEvents = eventGroup({
  source: 'Auth Store',
  events: {
    loginFailed: type<{ message: string }>(),
    mfaVerifyFailed: type<{ message: string }>(),
    mfaResendFailed: type<{ message: string }>(),
  },
});
