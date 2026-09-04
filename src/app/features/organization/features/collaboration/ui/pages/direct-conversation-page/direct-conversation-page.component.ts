import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import type { StoreError } from '@core/request-state';
import type {
  MessageOutput,
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
import { SubmissionGateService, type SubmissionGate } from '@features/organization/services';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { MessageThread } from '../../components/message-thread';
import { MessageDeleteDialog } from '../../dialogs/message-delete-dialog';
import { MessageEditDialog } from '../../dialogs/message-edit-dialog';
import { MessageComposer } from '../../forms/message-composer';
import { MessageReplySheet } from '../../sheets/message-reply-sheet';

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
    RouterLink,
    NgIcon,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmButton,
    MessageComposer,
    MessageDeleteDialog,
    MessageEditDialog,
    MessageReplySheet,
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
        canWrite: this.canWrite(),
        canManage: this.canManage(),
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
   * Property canManage
   * @readonly
   *
   * @description
   * Whether the reader holds `organization.messaging.manage`, which lets
   * them delete another member's message. Mirrors the server's check, never
   * replaces it.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed((): boolean =>
    this.memberAccess
      .permissions()
      .some(
        (granted: string): boolean =>
          granted === ORGANIZATION_PERMISSION.MESSAGING_MANAGE ||
          (granted.endsWith('.*') &&
            ORGANIZATION_PERMISSION.MESSAGING_MANAGE.startsWith(granted.slice(0, -1))),
      ),
  );

  /**
   * Property replyTargetId
   * @readonly
   *
   * @description
   * The message whose reply thread is open in the side sheet, or `null`.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly replyTargetId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property replyTargetView
   * @readonly
   *
   * @description
   * The reply sheet's parent, drawn from the same views the thread renders.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<MessageView | null>}
   */
  protected readonly replyTargetView: Signal<MessageView | null> = computed(
    (): MessageView | null =>
      this.messages().find((view: MessageView): boolean => view.id === this.replyTargetId()) ??
      null,
  );

  /**
   * Property editTargetId
   * @readonly
   *
   * @description
   * The message being edited, or `null` while the edit dialog is closed.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly editTargetId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property editTargetMessage
   * @readonly
   *
   * @description
   * The edit dialog's message in transport form — it needs the raw body and
   * the mention names, which the rendered view no longer carries.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<MessageOutput | null>}
   */
  protected readonly editTargetMessage: Signal<MessageOutput | null> = computed(
    (): MessageOutput | null => {
      const messageId: string | null = this.editTargetId();

      return messageId === null ? null : (this.thread.messageEntityMap()[messageId] ?? null);
    },
  );

  /**
   * Property deleteTargetId
   * @readonly
   *
   * @description
   * The message awaiting delete confirmation, or `null`.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly deleteTargetId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property editGate
   * @readonly
   *
   * @description
   * The edit dialog's claim on the thread's edit state, so a failure from an
   * earlier edit never leaks into a freshly opened dialog. Success closes
   * the dialog.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {SubmissionGate}
   */
  private readonly editGate: SubmissionGate = inject<SubmissionGateService>(
    SubmissionGateService,
  ).create(this.thread.editCallState, { onSuccess: (): void => this.editTargetId.set(null) });

  /**
   * Property deleteGate
   * @readonly
   *
   * @description
   * The delete confirmation's claim on the thread's delete state. Success
   * closes the confirm; a failure keeps it open, shown inline.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {SubmissionGate}
   */
  private readonly deleteGate: SubmissionGate = inject<SubmissionGateService>(
    SubmissionGateService,
  ).create(this.thread.deleteCallState, { onSuccess: (): void => this.deleteTargetId.set(null) });

  /**
   * Property editDialogBusy
   * @readonly
   * @description Whether the submitted edit is in flight.
   * @access protected
   * @since 3.0.0
   * @type {Signal<boolean>}
   */
  protected readonly editDialogBusy: Signal<boolean> = this.editGate.isBusy;

  /**
   * Property editDialogError
   * @readonly
   * @description The edit write's own error, scoped to a submit from this dialog.
   * @access protected
   * @since 3.0.0
   * @type {Signal<StoreError | null>}
   */
  protected readonly editDialogError: Signal<StoreError | null> = this.editGate.error;

  /**
   * Property deleteDialogBusy
   * @readonly
   * @description Whether the confirmed delete is in flight.
   * @access protected
   * @since 3.0.0
   * @type {Signal<boolean>}
   */
  protected readonly deleteDialogBusy: Signal<boolean> = this.deleteGate.isBusy;

  /**
   * Property deleteDialogError
   * @readonly
   * @description The delete write's own error, scoped to a confirm from this dialog.
   * @access protected
   * @since 3.0.0
   * @type {Signal<StoreError | null>}
   */
  protected readonly deleteDialogError: Signal<StoreError | null> = this.deleteGate.error;

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
   * Property messagesRouteBase
   * @readonly
   *
   * @description
   * Messaging index shown by the back control below desktop width.
   * Navigating there replaces the thread with the conversation-list extension.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly messagesRouteBase: Signal<string> = computed(
    () => `/organizations/${this.organizationContext.selectedOrganizationId() ?? ''}/messages`,
  );

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
        this.replyTargetId.set(null);
        this.editTargetId.set(null);
        this.deleteTargetId.set(null);
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
   * Method togglePin
   * @method togglePin
   *
   * @description
   * Pins or unpins a message. The direction is resolved here because the
   * thread holds the state the row was drawn from.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {string} messageId - The pressed row's message.
   *
   * @returns {void}
   */
  protected togglePin(messageId: string): void {
    const message: MessageOutput | undefined = this.thread.messageEntityMap()[messageId];

    if (message === undefined) return;

    if (message.pinnedAt !== undefined) {
      this.thread.unpin(messageId);

      return;
    }

    this.thread.pin(messageId);
  }

  /**
   * Method toggleSave
   * @method toggleSave
   *
   * @description
   * Bookmarks or un-bookmarks a message for the reader.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {string} messageId - The pressed row's message.
   *
   * @returns {void}
   */
  protected toggleSave(messageId: string): void {
    const message: MessageOutput | undefined = this.thread.messageEntityMap()[messageId];

    if (message === undefined) return;

    if (message.isSaved) {
      this.thread.unsave(messageId);

      return;
    }

    this.thread.save(messageId);
  }

  /**
   * Method submitEdit
   * @method submitEdit
   *
   * @description
   * Sends the edited body, claiming the edit state so this dialog owns the
   * outcome.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {string} body - The replacement body, markers restored.
   *
   * @returns {void}
   */
  protected submitEdit(body: string): void {
    const messageId: string | null = this.editTargetId();

    if (messageId === null) return;

    this.editGate.submit();
    this.thread.editMessage({ messageId, input: { body } });
  }

  /**
   * Method onEditDialogVisibleChange
   * @method onEditDialogVisibleChange
   *
   * @description
   * Clears the edit target and the gate's claim when the dialog closes.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {boolean} open - Whether the dialog is now open.
   *
   * @returns {void}
   */
  protected onEditDialogVisibleChange(open: boolean): void {
    if (open) return;

    this.editTargetId.set(null);
    this.editGate.reset();
  }

  /**
   * Method confirmDeleteMessage
   * @method confirmDeleteMessage
   *
   * @description
   * Tombstones the message awaiting confirmation.
   *
   * @access protected
   * @since 3.0.0
   *
   * @returns {void}
   */
  protected confirmDeleteMessage(): void {
    const messageId: string | null = this.deleteTargetId();

    if (messageId === null) return;

    this.deleteGate.submit();
    this.thread.deleteMessage(messageId);
  }

  /**
   * Method onDeleteDialogVisibleChange
   * @method onDeleteDialogVisibleChange
   *
   * @description
   * Clears the delete target and the gate's claim when the confirm closes.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {boolean} open - Whether the confirm is now open.
   *
   * @returns {void}
   */
  protected onDeleteDialogVisibleChange(open: boolean): void {
    if (open) return;

    this.deleteTargetId.set(null);
    this.deleteGate.reset();
  }

  /**
   * Method onReplySheetVisibleChange
   * @method onReplySheetVisibleChange
   *
   * @description
   * Clears the reply target when the sheet closes.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {boolean} open - Whether the sheet is now open.
   *
   * @returns {void}
   */
  protected onReplySheetVisibleChange(open: boolean): void {
    if (open) return;

    this.replyTargetId.set(null);
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
