import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant interventionWorkspaceStoreEvents
 * @const interventionWorkspaceStoreEvents
 *
 * @description
 * Component-scoped intervention workspace store events. `commentAddFailed` is
 * dispatched when posting a comment fails (including the offline guard) so
 * the app-wide feedback listener can surface a toast; the rest of the
 * workspace's mutations still report failures through the inline `error`
 * field.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionWorkspaceStoreEvents = eventGroup({
  source: 'Intervention Workspace Store',
  events: {
    commentAddFailed: type<StoreFailureEventPayload>(),
  },
});
