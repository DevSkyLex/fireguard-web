import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload } from '@core/request-state';

/**
 * Constant organizationInvitationAcceptStoreEvents
 *
 * @description
 * Events organizationInvitationAcceptStoreEvents
 * Separates membership invalidation from the single toast emitted for an acceptance result.
 *
 * @since 1.0.0
 *
 * @constant organizationInvitationAcceptStoreEvents
 */
export const organizationInvitationAcceptStoreEvents = eventGroup({
  source: 'Organization Invitation Accept Store',
  events: {
    acceptSucceeded: type<{ organizationId: string }>(),
    acceptFeedback: type<FeedbackEventPayload>(),
    acceptFailed: type<FeedbackEventPayload>(),
  },
});
