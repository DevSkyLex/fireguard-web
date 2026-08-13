import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import type {
  MessageReactionToggle,
  MessageView,
} from '@features/organization/features/collaboration/models';
import {
  DirectConversationsStore,
  MessageThreadStore,
  type DirectConversationsStoreType,
  type MessageThreadStoreType,
} from '@features/organization/features/collaboration/state';
import {
  buildMessageViews,
  memberIriOf,
} from '@features/organization/features/collaboration/utils';
import { ORGANIZATION_PERMISSION, type MemberDirectoryEntry } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type MemberDirectoryPort,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmSidebarService } from '@shared/ui/sidebar';
import { MessageThread } from '../../components/message-thread';
import { MessageComposer } from '../../forms/message-composer';

/**
 * Component DirectConversationPage
 * @class DirectConversationPage
 *
 * @description
 * One direct conversation: its counterpart in an in-column header, the thread,
 * and the composer.
 *
 * The header names the counterpart rather than the breadcrumb doing it: a
 * direct conversation has no subject, so resolving the name needs the whole
 * conversation list *plus* the member directory, which is more than a title
 * resolver can ask for.
 *
 * **The name is never a raw member id.** Only the list endpoint reports a
 * counterpart, and reading the directory needs a permission messaging does not
 * imply — so a deep link, a conversation past the first page of the list, and a
 * member without `members.read` all land on the same neutral label instead of a
 * UUID.
 *
 * The store is provided here but the router reuses this component when only the
 * conversation id changes, so the route effect resets it before loading rather
 * than trusting a fresh instance.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-direct-conversation-page',
  imports: [
    NgIcon,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmButton,
    MessageComposer,
    MessageThread,
  ],
  providers: [MessageThreadStore, provideIcons({ lucideArrowLeft })],
  templateUrl: './direct-conversation-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectConversationPage {
  //#region Inputs
  /**
   * Property conversationId
   * @readonly
   *
   * @description
   * The routed conversation, bound from `:conversationId`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly conversationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property thread
   * @readonly
   *
   * @description
   * This conversation's messages, its paging and its realtime connection.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MessageThreadStoreType}
   */
  protected readonly thread: MessageThreadStoreType =
    inject<MessageThreadStoreType>(MessageThreadStore);

  /**
   * Property counterpartName
   * @readonly
   *
   * @description
   * The counterpart's name, or a neutral label while it cannot be resolved.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly counterpartName: Signal<string> = computed((): string => {
    const counterpart: string | undefined = this.counterpart();

    if (counterpart === undefined || !this.directory.isAvailable()) return this.unknownLabel;

    const entry = this.directory.byId().get(this.memberIdOf(counterpart));

    return entry?.displayName ?? this.unknownLabel;
  });

  /**
   * Property counterpartAvatarUrl
   * @readonly
   *
   * @description
   * The counterpart's picture, when the directory could supply one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | undefined>}
   */
  protected readonly counterpartAvatarUrl: Signal<string | undefined> = computed(
    (): string | undefined => {
      const counterpart: string | undefined = this.counterpart();

      if (counterpart === undefined || !this.directory.isAvailable()) return undefined;

      return this.directory.byId().get(this.memberIdOf(counterpart))?.avatarUrl;
    },
  );

  /**
   * Property isCounterpartResolved
   * @readonly
   *
   * @description
   * Whether the header is showing a real name, so it can draw a placeholder
   * rather than dress the neutral label up as one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isCounterpartResolved: Signal<boolean> = computed(
    (): boolean => this.counterpartName() !== this.unknownLabel,
  );

  /**
   * Property messages
   * @readonly
   *
   * @description
   * The thread as the surface draws it: bodies rendered, authors named, and the
   * reader's own messages marked along with anything still unsent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MessageView[]>}
   */
  protected readonly messages: Signal<readonly MessageView[]> = computed(
    (): readonly MessageView[] =>
      buildMessageViews({
        messages: this.thread.sortedMessages(),
        pendingMessageIds: this.thread.pendingMessageIds(),
        failedMessageIds: this.thread.failedMessageIds(),
        ownMemberIri: memberIriOf(this.memberAccess.profile()),
        directory: this.directory.isAvailable() ? this.directory.byId() : null,
        unknownMemberLabel: this.unknownLabel,
      }),
  );

  /**
   * Property mentionCandidates
   * @readonly
   *
   * @description
   * Who can be mentioned here: the two people in the conversation, nobody else.
   *
   * The directory holds the whole organization, but a mention creates an inbox
   * item — so offering a third party would notify someone about a conversation
   * they cannot open. The counterpart appears only once the directory has
   * resolved them: a mention has to carry a real member id, and the neutral
   * label the header falls back to is not one.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly mentionCandidates: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => {
      if (!this.directory.isAvailable()) return [];

      const counterpart: string | undefined = this.counterpart();
      const directory: ReadonlyMap<string, MemberDirectoryEntry> = this.directory.byId();
      const ownId: string | undefined = this.memberAccess.profile()?.id;

      return [
        counterpart === undefined ? undefined : directory.get(this.memberIdOf(counterpart)),
        ownId === undefined ? undefined : directory.get(ownId),
      ].filter((member: MemberDirectoryEntry | undefined): member is MemberDirectoryEntry =>
        Boolean(member),
      );
    },
  );

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the reader may post here. Reading a conversation does not grant it,
   * so the composer is gated separately from the route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed((): boolean =>
    this.memberAccess
      .permissions()
      .some(
        (granted: string): boolean =>
          granted === ORGANIZATION_PERMISSION.MESSAGING_WRITE ||
          (granted.endsWith('.*') &&
            ORGANIZATION_PERMISSION.MESSAGING_WRITE.startsWith(granted.slice(0, -1))),
      ),
  );

  /**
   * Property composerPlaceholder
   * @readonly
   *
   * @description
   * Prompt naming who the message is going to, once that is known.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly composerPlaceholder: Signal<string> = computed((): string =>
    this.isCounterpartResolved()
      ? $localize`:@@messages.composer.placeholderNamed:Message ${this.counterpartName()}:name:`
      : $localize`:@@messages.composer.placeholder:Write a message`,
  );

  /**
   * Property sidebar
   * @readonly
   *
   * @description
   * The shell column, opened by the phone's back control: the conversations
   * live there now, so returning to them is opening the sheet rather than
   * navigating up — the route above holds only a placeholder.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {HlmSidebarService}
   */
  protected readonly sidebar: HlmSidebarService = inject<HlmSidebarService>(HlmSidebarService);

  /**
   * Property loadErrorMessage
   * @readonly
   *
   * @description
   * Why the conversation could not be read, or `null` when it could.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly loadErrorMessage: Signal<string | null> = computed(
    (): string | null => this.thread.loadError()?.message ?? null,
  );

  /** The counterpart's member IRI, reported only by the conversation list. */
  private readonly counterpart: Signal<string | undefined> = computed((): string | undefined =>
    this.conversations.counterpartFor(this.conversationId()),
  );

  private readonly conversations: DirectConversationsStoreType =
    inject<DirectConversationsStoreType>(DirectConversationsStore);

  private readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  private readonly document: Document = inject<Document>(DOCUMENT);

  /** Stands in wherever a member cannot be named. Never a raw id. */
  private readonly unknownLabel: string = $localize`:@@messages.unknownMember:Unknown member`;
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Wires the routed conversation to the thread. The order matters: the store
   * survives a conversation change, so it is emptied before the new one is
   * read, and the read marker moves only once the messages are on their way.
   *
   * Every store read here is untracked — the conversation list zeroes its own
   * unread badge in response to the very marker this moves, and tracking that
   * would make the effect re-run on its own consequence.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const conversationId: string = this.conversationId();

      untracked((): void => {
        this.thread.reset();
        this.thread.load(conversationId);
        this.thread.connect(conversationId);
        this.thread.markRead({ conversationId });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Posts a message to the open conversation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} body - The written message.
   *
   * @returns {void}
   */
  protected send(body: string): void {
    this.thread.send({ conversationId: this.conversationId(), input: { body } });
  }

  /**
   * Method toggleReaction
   * @method toggleReaction
   *
   * @description
   * Adds or withdraws the reader's reaction. The direction is the store's to
   * decide — it holds the tally the row was drawn from.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MessageReactionToggle} toggle - The pressed emoji and its message.
   *
   * @returns {void}
   */
  protected toggleReaction(toggle: MessageReactionToggle): void {
    this.thread.toggleReaction(toggle.messageId, toggle.emoji);
  }

  /**
   * Method markRead
   * @method markRead
   *
   * @description
   * Moves the read marker once the newest message is on screen, and only while
   * the tab is actually being looked at — a conversation read in a background
   * tab has not been read.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected markRead(): void {
    if (this.document.visibilityState !== 'visible') return;

    this.thread.markRead({ conversationId: this.conversationId() });
  }

  /**
   * Method memberIdOf
   * @method memberIdOf
   *
   * @description
   * The bare member id inside an organization-member IRI.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} memberIri - The IRI a message or conversation carries.
   *
   * @returns {string} The trailing id segment.
   */
  private memberIdOf(memberIri: string): string {
    return memberIri.slice(memberIri.lastIndexOf('/') + 1);
  }
  //#endregion
}
