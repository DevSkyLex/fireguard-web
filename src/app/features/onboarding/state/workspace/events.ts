import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload } from '@core/request-state';

/**
 * Events workspaceStoreEvents
 * @const workspaceStoreEvents
 * @description Publishes one app-wide toast per settled workspace command; membership invalidation uses the organization-owned event separately.
 * @since 1.0.0
 */
export const workspaceStoreEvents = eventGroup({
  source: 'Workspace Store',
  events: {
    commandSucceeded: type<FeedbackEventPayload>(),
    commandFailed: type<FeedbackEventPayload>(),
  },
});
