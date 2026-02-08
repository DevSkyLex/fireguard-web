import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OperationFailureEventPayload } from '../operations';

/**
 * Constant sessionStoreEvents
 * @const sessionStoreEvents
 *
 * @description
 * Session store events for handling session
 * operation failures.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const sessionStoreEvents = eventGroup({
  source: 'Session Store',
  events: {
    loadFailed: type<OperationFailureEventPayload>(),
    revokeFailed: type<OperationFailureEventPayload>(),
    revokeAllFailed: type<OperationFailureEventPayload>(),
  },
});
