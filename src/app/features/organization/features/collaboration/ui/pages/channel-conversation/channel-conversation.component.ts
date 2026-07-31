import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  type Signal,
  untracked,
} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { FeedbackService } from '@core/feedback';
import {
  toChatMessageItem,
  withChatMessageStatus,
} from '@features/organization/features/collaboration/data-access/adapters';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import {
  ChannelsStore,
  MessageRepliesStore,
  MessageThreadStore,
} from '@features/organization/features/collaboration/state';
import {
  MessageComposer,
  MessageReferenceCard,
} from '@features/organization/features/collaboration/ui/components';
import { MessageThreadDrawer } from '@features/organization/features/collaboration/ui/drawers';
import { memberIriOf } from '@features/organization/features/collaboration/utils';
import { ORGANIZATION_PERMISSION, type MemberDirectoryEntry } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  type MemberDirectoryPort,
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { ChatMessageExtraDirective, ChatThread, type ChatMessageItem } from '@shared/chat';

/**
 * Component ChannelConversationPage
 * @class ChannelConversationPage
 *
 * @description
 * Route entry for one channel's conversation: the thread, and the composer
 * pinned beneath it.
 *
 * Owns the orchestration — route parameter, stores, and what each child event
 * does — while the thread rows and the composer stay presentational.
 *
 * The thread scrolls on its own rather than letting the shell scroll, which is
 * what keeps the composer pinned while history moves behind it.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-channel-conversation />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-conversation',
  imports: [
    ChatMessageExtraDirective,
    ChatThread,
    MessageComposer,
    MessageReferenceCard,
    MessageThreadDrawer,
  ],
  providers: [ChannelsStore, MessageRepliesStore, MessageThreadStore],
  templateUrl: './channel-conversation.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col', 'data-testid': 'channel-conversation' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelConversationPage {
  //#region Inputs
  /**
   * Property channelId
   * @readonly
   *
   * @description
   * Routed channel identifier, bound from the URL by
   * `withComponentInputBinding()`. A channel id doubles as its conversation id.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly channelId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property channels
   * @readonly
   *
   * @description
   * Channel store, used for the single-channel read — the only endpoint
   * reporting a real unread count.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof ChannelsStore>}
   */
  protected readonly channels: InstanceType<typeof ChannelsStore> = inject(ChannelsStore);

  /**
   * Property thread
   * @readonly
   *
   * @description
   * The channel's message thread.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof MessageThreadStore>}
   */
  protected readonly thread: InstanceType<typeof MessageThreadStore> = inject(MessageThreadStore);

  /**
   * Property replies
   * @readonly
   *
   * @description
   * The open message's reply thread. Separate from {@link thread} because the
   * API keeps replies out of a conversation's message list entirely.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {InstanceType<typeof MessageRepliesStore>}
   */
  protected readonly replies: InstanceType<typeof MessageRepliesStore> =
    inject(MessageRepliesStore);

  /**
   * Property confirmation
   * @readonly
   *
   * @description
   * Confirmation prompts. Deleting a message is a tombstone the member cannot
   * undo, so it is never one click away.
   *
   * @access private
   * @since 1.4.0
   *
   * @type {ConfirmationService}
   */
  private readonly confirmation: ConfirmationService = inject(ConfirmationService);

  /**
   * Property feedback
   * @readonly
   *
   * @description
   * Toasts. Copying leaves no visible trace of its own, so it needs one.
   *
   * @access private
   * @since 1.4.0
   *
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * The reader's membership, for deciding whose messages they may delete.
   *
   * @access private
   * @since 1.4.0
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  /**
   * Property actingMember
   * @readonly
   *
   * @description
   * The reader's member IRI, in the form messages carry, or `null`.
   *
   * @access private
   * @since 1.4.0
   *
   * @type {Signal<string | null>}
   */
  private readonly actingMember: Signal<string | null> = computed((): string | null =>
    memberIriOf(this.memberAccess.profile()),
  );

  /**
   * Property canModerate
   * @readonly
   *
   * @description
   * Whether the reader may delete anyone's message, not only their own. The
   * server enforces the same rule; this only keeps the control off rows it
   * would refuse.
   *
   * @access private
   * @since 1.4.0
   *
   * @type {Signal<boolean>}
   */
  private readonly canModerate: Signal<boolean> = computed((): boolean =>
    this.memberAccess.permissions().includes(ORGANIZATION_PERMISSION.MESSAGING_MANAGE),
  );

  /**
   * Property composerPlaceholder
   * @readonly
   *
   * @description
   * Prompt naming the channel being written to.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly composerPlaceholder: Signal<string> = computed((): string => {
    const name: string | undefined = this.channels.detailCallState().data?.name;

    return name ? $localize`:@@workspace.composer.placeholder:Message #${name}:channelName:` : '';
  });

  /**
   * Property baseMessages
   * @readonly
   *
   * @description
   * The thread projected onto the shared chat view-model, before delivery state
   * is applied.
   *
   * Split from {@link chatMessages} on purpose: rendering a mention chip means
   * running a regex over every body, and sending a message touches the store's
   * in-flight ids. Folded into one computed, every send would re-render the
   * mentions of the whole loaded thread.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {Signal<readonly ChatMessageItem<MessageOutput>[]>}
   */
  private readonly baseMessages: Signal<readonly ChatMessageItem<MessageOutput>[]> = computed(
    (): readonly ChatMessageItem<MessageOutput>[] => {
      const memberNames: Readonly<Record<string, string>> = this.mentionNames();
      const actingMember: string | null = this.actingMember();
      const canModerate: boolean = this.canModerate();

      return this.thread.messageEntities().map(
        (message: MessageOutput): ChatMessageItem<MessageOutput> =>
          toChatMessageItem(message, {
            status: 'sent',
            memberNames,
            actingMember,
            canModerate,
            unknownMention: $localize`:@@workspace.mention.unknown:member`,
            unknownAuthor: $localize`:@@workspace.message.unknownAuthor:Unknown member`,
          }),
      );
    },
  );

  /**
   * Property chatMessages
   * @readonly
   *
   * @description
   * The same messages with their delivery state applied — the cheap half of the
   * pair, and untouched when nothing is in flight.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {Signal<readonly ChatMessageItem<MessageOutput>[]>}
   */
  protected readonly chatMessages: Signal<readonly ChatMessageItem<MessageOutput>[]> = computed(
    (): readonly ChatMessageItem<MessageOutput>[] => {
      const status: ReadonlyMap<string, 'pending' | 'failed'> = this.messageStatus();

      if (status.size === 0) return this.baseMessages();

      return this.baseMessages().map(
        (message: ChatMessageItem<MessageOutput>): ChatMessageItem<MessageOutput> => {
          const delivery: 'pending' | 'failed' | undefined = status.get(message.id);

          return delivery === undefined ? message : withChatMessageStatus(message, delivery);
        },
      );
    },
  );

  /**
   * Property loadErrorMessage
   * @readonly
   *
   * @description
   * What to show above the history when the read failed, already worded — the
   * thread owns no error model of its own.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly loadErrorMessage: Signal<string | null> = computed((): string | null =>
    this.thread.loadError()
      ? $localize`:@@workspace.thread.loadFailed:Messages could not be loaded.`
      : null,
  );

  /**
   * Property replyMessages
   * @readonly
   *
   * @description
   * The open thread's replies, on the same view-model as the conversation.
   *
   * No delivery state to fold in here: replies take their id from the server,
   * so there is no optimistic row to reconcile.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<readonly ChatMessageItem<MessageOutput>[]>}
   */
  protected readonly replyMessages: Signal<readonly ChatMessageItem<MessageOutput>[]> = computed(
    (): readonly ChatMessageItem<MessageOutput>[] => {
      const memberNames: Readonly<Record<string, string>> = this.mentionNames();
      const actingMember: string | null = this.actingMember();
      const canModerate: boolean = this.canModerate();

      return this.replies.replyEntities().map(
        (message: MessageOutput): ChatMessageItem<MessageOutput> =>
          toChatMessageItem(message, {
            status: 'sent',
            memberNames,
            actingMember,
            canModerate,
            unknownMention: $localize`:@@workspace.mention.unknown:member`,
            unknownAuthor: $localize`:@@workspace.message.unknownAuthor:Unknown member`,
          }),
      );
    },
  );

  /**
   * Property replyParent
   * @readonly
   *
   * @description
   * The root message the open thread hangs off, read back out of the
   * conversation rather than copied when the thread opened — so its reactions
   * and its reply count stay live while the panel is open.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<ChatMessageItem<MessageOutput> | null>}
   */
  protected readonly replyParent: Signal<ChatMessageItem<MessageOutput> | null> = computed(
    (): ChatMessageItem<MessageOutput> | null => {
      const parentId: string | null = this.replies.parentMessageId();

      if (parentId === null) return null;

      return (
        this.chatMessages().find(
          (message: ChatMessageItem<MessageOutput>): boolean => message.id === parentId,
        ) ?? null
      );
    },
  );

  /**
   * Property replyErrorMessage
   * @readonly
   *
   * @description
   * What to show in the panel when the replies could not be read.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly replyErrorMessage: Signal<string | null> = computed((): string | null =>
    this.replies.loadError()
      ? $localize`:@@workspace.replies.loadFailed:Replies could not be loaded.`
      : null,
  );

  /**
   * Property messageStatus
   * @readonly
   *
   * @description
   * Delivery state by message id, for the few messages that have one.
   *
   * The store keeps these as arrays, which is the right shape for state but the
   * wrong one for rendering: bound directly, each row ran two `includes()`
   * scans of the whole list on every change-detection pass. One map, built
   * once, answers both in constant time.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {Signal<ReadonlyMap<string, 'pending' | 'failed'>>}
   */
  private readonly messageStatus: Signal<ReadonlyMap<string, 'pending' | 'failed'>> = computed(
    (): ReadonlyMap<string, 'pending' | 'failed'> => {
      const status = new Map<string, 'pending' | 'failed'>();

      for (const id of this.thread.pendingMessageIds()) status.set(id, 'pending');
      // After pending on purpose: a message that failed is no longer in flight,
      // and the store does move it, but the render must not depend on that.
      for (const id of this.thread.failedMessageIds()) status.set(id, 'failed');

      return status;
    },
  );

  /**
   * Property directory
   * @readonly
   *
   * @description
   * Member directory, backing the composer's mention picker.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {MemberDirectoryPort}
   */
  private readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Routed organization — the directory is loaded per organization, and the
   * route only carries the channel.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property mentionMembers
   * @readonly
   *
   * @description
   * Who the composer may offer. Empty without `organization.members.read`,
   * which is a working composer with no suggestions rather than an error.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly mentionMembers: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => [...this.directory.byId().values()],
  );

  /**
   * Property mentionNames
   * @readonly
   *
   * @description
   * Display names for every mention the thread can render, resolved once for
   * the whole thread rather than per row.
   *
   * The directory sits underneath and the messages' own names on top: a message
   * carries authoritative names, but the optimistic row of a message just sent
   * carries none at all, and the chip would read "member" until the server
   * echoed it back.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly mentionNames: Signal<Readonly<Record<string, string>>> = computed(
    (): Readonly<Record<string, string>> => {
      const names: Record<string, string> = {};

      for (const entry of this.directory.byId().values()) {
        names[entry.memberId] = entry.displayName;
      }

      for (const message of this.thread.messageEntities()) {
        Object.assign(names, message.mentionNames);
      }

      // Replies are a separate collection the conversation never returns, so
      // their own authoritative names have to be folded in too.
      for (const reply of this.replies.replyEntities()) {
        Object.assign(names, reply.mentionNames);
      }

      return names;
    },
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Loads the channel and its first page of messages whenever the route
   * changes.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const channelId: string = this.channelId();

      this.channels.loadOne(channelId);
      this.thread.load({ conversationId: channelId });
      // A channel id *is* its conversation id, so the realtime topic follows
      // the route directly. The store is component-scoped, so leaving the page
      // releases the subscription.
      this.thread.connect(channelId);
      // Opening the channel clears its unread badge in the sidebar.
      this.thread.markRead({ conversationId: channelId });
      // A thread left open over the previous channel would show its replies
      // above the new conversation.
      this.replies.close();
    });

    effect((): void => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (organizationId === null) return;

      // `ensureLoaded` reads store state to decide whether to fetch; untracked
      // keeps that read out of this effect's dependencies.
      untracked((): void => this.directory.ensureLoaded(organizationId));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Posts what the composer emitted.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} body - Trimmed message body.
   *
   * @return {void}
   */
  protected send(body: string): void {
    this.thread.send({ conversationId: this.channelId(), input: { body } });
  }

  /**
   * Method react
   * @method react
   *
   * @description
   * Adds a reaction to a message.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} messageId - Message being reacted to.
   * @param {string} emoji - Emoji to add.
   *
   * @return {void}
   */
  protected react(messageId: string, emoji: string): void {
    this.thread.react({ messageId, input: { emoji } });
  }

  /**
   * Method removeReaction
   * @method removeReaction
   *
   * @description
   * Takes back the acting member's reaction with an emoji.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} messageId - Message the reaction is on.
   * @param {string} emoji - Emoji to take back.
   *
   * @return {void}
   */
  protected removeReaction(messageId: string, emoji: string): void {
    this.thread.removeReaction({ messageId, emoji });
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Sends a failed message again, under the id it already carries.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} clientId - Client-minted id of the failed message.
   *
   * @return {void}
   */
  protected retry(clientId: string): void {
    void this.thread.retryFailed(clientId);
  }

  /**
   * Method loadOlder
   * @method loadOlder
   *
   * @description
   * Fetches the next page of history. Messages arrive oldest-first, so older
   * history is a *further* page, not a previous one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected loadOlder(): void {
    this.thread.load({
      conversationId: this.channelId(),
      page: this.thread.loadedPage() + 1,
    });
  }

  /**
   * Method copy
   * @method copy
   *
   * @description
   * Puts a message's text on the clipboard and says so — the action leaves no
   * visible trace of its own.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {string} text - The message, already flattened to plain text.
   *
   * @return {void}
   */
  protected copy(text: string): void {
    void navigator.clipboard.writeText(text).then(
      (): void =>
        this.feedback.success($localize`:@@workspace.message.copied:Message copied to clipboard.`),
      (): void =>
        this.feedback.error(
          $localize`:@@workspace.message.copyFailed:The message could not be copied.`,
        ),
    );
  }

  /**
   * Method markReadUpTo
   * @method markReadUpTo
   *
   * @description
   * Moves the read marker to a message, which is what clears the channel's
   * unread badge from a point the member chooses rather than from now.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {string} messageId - Message to mark read up to.
   *
   * @return {void}
   */
  protected markReadUpTo(messageId: string): void {
    this.thread.markRead({ conversationId: this.channelId(), lastReadMessageId: messageId });
    this.feedback.success($localize`:@@workspace.message.markedRead:Marked as read.`);
  }

  /**
   * Method requestDelete
   * @method requestDelete
   *
   * @description
   * Asks before tombstoning: the row survives, redacted, and the member cannot
   * put the text back.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {string} messageId - Message to delete.
   *
   * @return {void}
   */
  protected requestDelete(messageId: string): void {
    this.confirmation.confirm({
      header: $localize`:@@workspace.message.delete.header:Delete message`,
      message: $localize`:@@workspace.message.delete.confirm:This message will be removed from the conversation for everyone. This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@chat.message.delete:Delete message`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: (): void => {
        this.thread.remove(messageId);
      },
    });
  }

  /**
   * Method openReplies
   * @method openReplies
   *
   * @description
   * Opens a message's reply thread and reads its first page.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {string} messageId - Root message of the thread.
   *
   * @return {void}
   */
  protected openReplies(messageId: string): void {
    this.replies.load({ parentMessageId: messageId });
  }

  /**
   * Method onRepliesVisibleChange
   * @method onRepliesVisibleChange
   *
   * @description
   * Closes the reply panel when the drawer reports it dismissed.
   *
   * The guard matters: PrimeNG's drawer emits `visibleChange` on **show** as
   * well as on hide, so acting on every emission closed the panel the instant
   * it opened.
   *
   * Closing drops what was loaded, so reopening starts from a clean read
   * rather than over the previous thread's rows.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {boolean} visible - The visibility the drawer is reporting.
   *
   * @return {void}
   */
  protected onRepliesVisibleChange(visible: boolean): void {
    if (visible) return;

    this.replies.close();
  }

  /**
   * Method loadOlderReplies
   * @method loadOlderReplies
   *
   * @description
   * Fetches the next page of the open thread.
   *
   * @access protected
   * @since 1.4.0
   *
   * @return {void}
   */
  protected loadOlderReplies(): void {
    const parentMessageId: string | null = this.replies.parentMessageId();

    if (parentMessageId === null) return;

    this.replies.load({ parentMessageId, page: this.replies.loadedPage() + 1 });
  }

  /**
   * Method sendReply
   * @method sendReply
   *
   * @description
   * Posts a reply to the open thread.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {string} body - Trimmed reply body.
   *
   * @return {void}
   */
  protected sendReply(body: string): void {
    const parentMessageId: string | null = this.replies.parentMessageId();

    if (parentMessageId === null) return;

    this.replies.send({ parentMessageId, input: { body } });
  }
  //#endregion
}
