import type { CallState } from '@core/request-state';
import type {
  ChannelOutput,
  ChannelPanelTab,
  ChannelParticipantOutput,
  ConversationActivityBucketOutput,
  ConversationAttachmentOutput,
  MessageOutput,
  MessagingLinkOutput,
} from '@features/collaboration/models';

/**
 * Interface ChannelPanelState
 * @interface ChannelPanelState
 *
 * @description
 * State of {@link ChannelPanelStore}.
 *
 * Every collection is a fully-replaced read, so each lives in a plain
 * `CallState` rather than an entity collection: nothing here is looked up or
 * mutated by id.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChannelPanelState {
  /** Channel the loaded data belongs to, or `null` before the first open. */
  readonly loadedChannelId: string | null;
  /** Organization the sibling-channel list was loaded for. */
  readonly loadedOrganizationId: string | null;
  readonly activeTab: ChannelPanelTab;
  /** `GET /api/channels/{id}` — the only endpoint reporting a real unread count. */
  readonly channelCallState: CallState<ChannelOutput>;
  /** `GET /api/channels/{id}/participants` — unpaginated and uncapped. */
  readonly participantsCallState: CallState<readonly ChannelParticipantOutput[]>;
  /** `GET /api/conversations/{id}/activity` — zero-filled daily counts. */
  readonly activityCallState: CallState<readonly ConversationActivityBucketOutput[]>;
  /** `GET /api/conversations/{id}/pinned-messages`. */
  readonly pinsCallState: CallState<readonly MessageOutput[]>;
  /** `GET /api/conversations/{id}/attachments`. */
  readonly filesCallState: CallState<readonly ConversationAttachmentOutput[]>;
  /** `GET /api/conversations/{id}/links`. */
  readonly linksCallState: CallState<readonly MessagingLinkOutput[]>;
  /**
   * The organization's channels, used only to derive this channel's children.
   * `GET /api/channels` has no `parent` filter, so nesting can only be read off
   * the full list.
   */
  readonly siblingsCallState: CallState<readonly ChannelOutput[]>;
}
