import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';
import type { InterventionAttachmentOutput } from '@features/organization/features/interventions/models';

/**
 * Constant interventionWorkspaceStoreEvents
 * @const interventionWorkspaceStoreEvents
 *
 * @description
 * Component-scoped intervention workspace store events. `commentAddFailed` is
 * dispatched when posting a comment fails (including the offline guard) so
 * the app-wide feedback listener can surface a toast; `rejectChangeFailed`
 * plays the same role for a proposed-change rejection (a row-scoped action
 * whose failure would otherwise be easy to miss); `deleteSucceeded` is
 * dispatched when the intervention is deleted so the toast fires and the page
 * can navigate away before the store is torn down; `attachmentUploadSucceeded`
 * is dispatched on every successful upload so the page can chain a follow-up
 * write — the completion-signature flow submits only once the signature
 * upload it interposed has actually landed. `assignTeamSucceeded` and
 * `assignTeamFailed` report the outcome of a team assignment so the toolbar
 * dialog can close and the toast fire. The rest of the workspace's
 * mutations still report failures through the inline `error` field.
 *
 * @version 1.2.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionWorkspaceStoreEvents = eventGroup({
  source: 'Intervention Workspace Store',
  events: {
    commentAddFailed: type<StoreFailureEventPayload>(),
    rejectChangeFailed: type<StoreFailureEventPayload>(),
    deleteSucceeded: type<FeedbackEventPayload>(),
    attachmentUploadSucceeded: type<{ readonly attachment: InterventionAttachmentOutput }>(),
    assignTeamSucceeded: type<FeedbackEventPayload>(),
    assignTeamFailed: type<FeedbackEventPayload>(),
  },
});
