import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant organizationTeamsStoreEvents
 * @const organizationTeamsStoreEvents
 *
 * @description
 * Organization teams store events. Each success event carries a
 * `FeedbackEventPayload`, picked up by the app-wide feedback listener and
 * rendered as a confirmation toast; the owning page also uses
 * `teamCreated`/`teamUpdated`/`teamRemoved` to close the active dialog and
 * `mutationFailed` to drive a live-region error announcement. Load failures
 * (the teams list, a team's member roster) stay inline through the store's
 * own `loadError`/`membersError` and are not dispatched here.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const organizationTeamsStoreEvents = eventGroup({
  source: 'Organization Teams Store',
  events: {
    /** Dispatched when a team is created. */
    teamCreated: type<FeedbackEventPayload>(),
    /** Dispatched when a team is renamed or redescribed. */
    teamUpdated: type<FeedbackEventPayload>(),
    /** Dispatched when a team is deleted. */
    teamRemoved: type<FeedbackEventPayload>(),
    /** Dispatched when a member is added to the selected team. */
    teamMemberAdded: type<FeedbackEventPayload>(),
    /** Dispatched when a member is removed from the selected team. */
    teamMemberRemoved: type<FeedbackEventPayload>(),
    /** Dispatched when a create/update/remove/member mutation fails. */
    mutationFailed: type<StoreFailureEventPayload>(),
  },
});
