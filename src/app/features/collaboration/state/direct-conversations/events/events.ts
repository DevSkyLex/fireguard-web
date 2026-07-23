import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';
import type { ConversationOutput } from '@features/collaboration/models';

/**
 * Constant directConversationsStoreEvents
 * @const directConversationsStoreEvents
 *
 * @description
 * Notable direct-conversations transitions other layers react to — navigating
 * to a conversation just opened from the member picker, toasts on failure.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const directConversationsStoreEvents = eventGroup({
  source: 'Direct Conversations Store',
  events: {
    opened: type<ConversationOutput>(),
    loadFailed: type<StoreFailureEventPayload>(),
    openFailed: type<StoreFailureEventPayload>(),
  },
});
