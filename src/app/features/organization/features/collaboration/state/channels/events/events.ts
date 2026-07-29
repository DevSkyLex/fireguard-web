import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';
import type { ChannelOutput } from '@features/organization/features/collaboration/models';

/**
 * Constant channelsStoreEvents
 * @const channelsStoreEvents
 *
 * @description
 * Notable {@link ChannelsStore} transitions other layers react to — navigation
 * after a create, toasts on failure.
 *
 * `hierarchyRejected` is separate from `mutationFailed` because its `409`
 * carries a meaning the member can act on (the move would make a cycle, or
 * exceed the allowed depth) rather than a generic failure.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const channelsStoreEvents = eventGroup({
  source: 'Channels Store',
  events: {
    created: type<ChannelOutput>(),
    archived: type<string>(),
    deleted: type<string>(),
    loadFailed: type<StoreFailureEventPayload>(),
    mutationFailed: type<StoreFailureEventPayload>(),
    hierarchyRejected: type<StoreFailureEventPayload>(),
  },
});
