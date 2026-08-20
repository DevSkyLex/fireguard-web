import type { CallState } from '@core/request-state';
import type { ChannelParticipantOutput } from '@features/organization/features/collaboration/models';

/**
 * Interface ChannelParticipantsState
 * @interface ChannelParticipantsState
 *
 * @description
 * State of {@link ChannelParticipantsStore}.
 *
 * The roster is a fully-replaced read on every load, so it lives in a plain
 * `CallState` rather than an entity collection — nothing here is looked up
 * by id outside the list itself.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChannelParticipantsState {
  /** Channel the loaded roster belongs to, or `null` before the first load. */
  readonly channelId: string | null;
  /** `GET /api/channels/{id}/participants`. */
  readonly listCallState: CallState<readonly ChannelParticipantOutput[]>;
  /** Add and remove. */
  readonly mutationCallState: CallState;
}
