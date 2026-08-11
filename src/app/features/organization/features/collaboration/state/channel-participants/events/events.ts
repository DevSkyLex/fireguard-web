import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant channelParticipantsStoreEvents
 * @const channelParticipantsStoreEvents
 *
 * @description
 * Notable {@link ChannelParticipantsStore} failures. Picked up by the app-wide
 * feedback listener (`core/feedback`) — no page subscribes to these directly.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const channelParticipantsStoreEvents = eventGroup({
  source: 'Channel Participants Store',
  events: {
    mutationFailed: type<StoreFailureEventPayload>(),
  },
});
