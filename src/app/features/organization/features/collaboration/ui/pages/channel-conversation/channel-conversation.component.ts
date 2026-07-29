import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type {
  MessageOutput,
  ThreadEntry,
} from '@features/organization/features/collaboration/models';
import {
  ChannelsStore,
  MessageThreadStore,
} from '@features/organization/features/collaboration/state';
import {
  MessageComposer,
  MessageRow,
} from '@features/organization/features/collaboration/ui/components';
import { groupThreadMessages } from '@features/organization/features/collaboration/utils';
import { EmptyState, Skeleton } from '@shared/components';

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
  imports: [DatePipe, EmptyState, MessageComposer, MessageRow, Skeleton],
  providers: [ChannelsStore, MessageThreadStore],
  templateUrl: './channel-conversation.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
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
   * Property entries
   * @readonly
   *
   * @description
   * The thread as it renders: day separators, and messages flagged as
   * continuations of the previous author's run.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly ThreadEntry[]>}
   */
  protected readonly entries: Signal<readonly ThreadEntry[]> = computed(
    (): readonly ThreadEntry[] => groupThreadMessages(this.thread.messageEntities()),
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
      this.thread.markRead(channelId);
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method authorNameFor
   * @method authorNameFor
   *
   * @description
   * Resolves an author's display label.
   *
   * The name rides on the message itself. Resolving it client-side needs the
   * member directory, which is gated behind `organization.members.read`, so
   * every member without that permission was shown a raw UUID above every
   * message — which is what this used to render for everyone.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MessageOutput} message - Message whose author is being labelled.
   *
   * @return {string} The author's name, or a neutral label — never an id.
   */
  protected authorNameFor(message: MessageOutput): string {
    return (
      message.authorDisplayName ?? $localize`:@@workspace.message.unknownAuthor:Unknown member`
    );
  }

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
  //#endregion
}
