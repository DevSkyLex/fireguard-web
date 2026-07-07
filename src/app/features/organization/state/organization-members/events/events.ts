import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload } from '@core/request-state';

/**
 * Constant organizationMembersStoreEvents
 * @const organizationMembersStoreEvents
 *
 * @description
 * Organization members store events. Each success event carries a
 * `FeedbackEventPayload`, picked up by the app-wide feedback listener and
 * rendered as a confirmation toast. Failures keep surfacing through the page's
 * inline error banner and the quota upgrade dialog.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const organizationMembersStoreEvents = eventGroup({
  source: 'Organization Members Store',
  events: {
    /** Dispatched when an invitation is sent. */
    inviteSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when an invitation is resent. */
    resendSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when an invitation is revoked. */
    revokeSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when a role is assigned to a member. */
    assignRoleSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when a bulk role assignment completes but some members failed. */
    assignRoleToMembersFailed: type<FeedbackEventPayload>(),
    /** Dispatched when a role is removed from a member. */
    removeRoleSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when a single member is removed. */
    removeMemberSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when several members are removed in one action. */
    removeMembersSucceeded: type<FeedbackEventPayload>(),
    /** Dispatched when a bulk removal completes but some members could not be removed. */
    removeMembersFailed: type<FeedbackEventPayload>(),
  },
});
