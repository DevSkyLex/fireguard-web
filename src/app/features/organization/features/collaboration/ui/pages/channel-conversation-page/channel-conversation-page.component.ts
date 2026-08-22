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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideEllipsisVertical,
  lucidePencilLine,
  lucideStar,
  lucideTrash2,
  lucideUsers,
} from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { Observable } from 'rxjs';
import type { StoreError } from '@core/request-state';
import { ConversationService } from '@features/organization/features/collaboration/data-access';
import type {
  ChannelOutput,
  ChannelParticipantOutput,
  MessageReactionToggle,
  MessageView,
} from '@features/organization/features/collaboration/models';
import {
  ChannelParticipantsStore,
  ChannelsStore,
  channelsStoreEvents,
  MessageThreadStore,
  type ChannelParticipantsStoreType,
  type ChannelsStoreType,
  type MessageThreadStoreType,
} from '@features/organization/features/collaboration/state';
import {
  buildMessageViews,
  memberIriOf,
} from '@features/organization/features/collaboration/utils';
import {
  ORGANIZATION_PERMISSION,
  type MemberDirectoryEntry,
  type OrganizationPermissionName,
} from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type MemberDirectoryPort,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { SubmissionGateService, type SubmissionGate } from '@features/organization/services';
import { HlmButton } from '@shared/ui/button';
import {
  HlmDropdownMenu,
  HlmDropdownMenuGroup,
  HlmDropdownMenuItem,
  HlmDropdownMenuSeparator,
  HlmDropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { MessageThread } from '../../components/message-thread';
import { ChannelDeleteDialog } from '../../dialogs/channel-delete-dialog';
import { ChannelEditDialog, type ChannelEditDraft } from '../../dialogs/channel-edit-dialog';
import { MessageComposer } from '../../forms/message-composer';
import {
  ChannelParticipantsSheet,
  type ChannelParticipantView,
} from '../../sheets/channel-participants-sheet';

/**
 * Component ChannelConversationPage
 * @class ChannelConversationPage
 *
 * @description
 * One channel's room: an in-column header naming it, the thread, the
 * composer, and the administration surfaces gated on
 * `organization.messaging.manage`.
 *
 * Mirrors `DirectConversationPage` structurally — the same `MessageThread` /
 * `MessageComposer` composition, the same route-driven reset-then-load
 * effect, the same read-marker and realtime wiring — because a channel *is*
 * a conversation row on this API: `channelId === conversationId`, so the
 * thread machinery built for direct messages works here unchanged, pointed
 * at the channel's own id.
 *
 * `ChannelsStore` is injected rather than provided here: `ChannelsPage`
 * provides it, component-scoped, and this page — rendered through that
 * page's router-outlet — resolves the same instance, the way `AccountMenu`
 * and a routed page can share one root-provided store, just one level
 * shallower. That is what lets a rename or a favorite toggle made from this
 * room show up in the list without a refetch.
 *
 * Favoriting calls `ConversationService` directly rather than through
 * `ChannelsStore`: the store's public surface is load, loadOne, create,
 * update, remove and setParent, and a channel's favorite state has no
 * dedicated write there. `ChannelsStore.loadOne` — already trustworthy,
 * since it is the one endpoint that reports real derived fields — is what
 * folds the result back into the shared entity afterwards.
 *
 * The header shows no topic line: `ChannelOutput` carries no description or
 * topic field on this API, so there is nothing to render there yet.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-conversation-page',
  imports: [
    NgIcon,
    RouterLink,
    ChannelDeleteDialog,
    ChannelParticipantsSheet,
    ChannelEditDialog,
    HlmButton,
    HlmDropdownMenu,
    HlmDropdownMenuGroup,
    HlmDropdownMenuItem,
    HlmDropdownMenuSeparator,
    HlmDropdownMenuTrigger,
    MessageComposer,
    MessageThread,
  ],
  providers: [
    MessageThreadStore,
    ChannelParticipantsStore,
    provideIcons({
      lucideArrowLeft,
      lucideEllipsisVertical,
      lucidePencilLine,
      lucideStar,
      lucideTrash2,
      lucideUsers,
    }),
  ],
  templateUrl: './channel-conversation-page.component.html',
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
   * The routed channel, bound from `:channelId` — and, on this API, the
   * conversation id every thread and panel read is made against.
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
   * Property thread
   * @readonly
   *
   * @description
   * This channel's messages, its paging and its realtime connection.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MessageThreadStoreType}
   */
  protected readonly thread: MessageThreadStoreType =
    inject<MessageThreadStoreType>(MessageThreadStore);

  /**
   * Property channels
   * @readonly
   *
   * @description
   * The shared list/administration store, resolved from `ChannelsPage`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChannelsStoreType}
   */
  protected readonly channels: ChannelsStoreType = inject<ChannelsStoreType>(ChannelsStore);

  /**
   * Property participantsStore
   * @readonly
   *
   * @description
   * This channel's roster and its add/remove flow.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChannelParticipantsStoreType}
   */
  protected readonly participantsStore: ChannelParticipantsStoreType =
    inject<ChannelParticipantsStoreType>(ChannelParticipantsStore);

  /**
   * Property channel
   * @readonly
   *
   * @description
   * The routed channel's own row, read from the shared store rather than a
   * page-local read — `null` until the list or `loadOne` has it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChannelOutput | null>}
   */
  protected readonly channel: Signal<ChannelOutput | null> = computed(
    (): ChannelOutput | null => this.channels.channelEntityMap()[this.channelId()] ?? null,
  );

  /**
   * Property channelName
   * @readonly
   *
   * @description
   * The channel's `#`-prefixed name, the way it is named everywhere else in
   * the workspace, or a neutral fallback before it resolves.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly channelName: Signal<string> = computed((): string => {
    const channel: ChannelOutput | null = this.channel();

    return channel === null ? this.unknownChannelLabel : `#${channel.name}`;
  });

  /**
   * Property isFavorite
   * @readonly
   *
   * @description
   * Whether the acting member favorited this channel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isFavorite: Signal<boolean> = computed(
    (): boolean => this.channel()?.isFavorite ?? false,
  );

  /**
   * Property participantCount
   * @readonly
   *
   * @description
   * How many members are in the channel, for the header. Falls back to the
   * roster's own length before `channel` has resolved.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly participantCount: Signal<number> = computed(
    (): number => this.channel()?.participantCount ?? this.participantsStore.participants().length,
  );

  /**
   * Property participantsButtonLabel
   * @readonly
   *
   * @description
   * The header's participant count control is a button that opens the
   * roster, so its accessible name states the action rather than repeating
   * the visible count alone.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly participantsButtonLabel: Signal<string> = computed(
    (): string =>
      $localize`:@@channels.room.participantsButtonAria:View the ${this.participantCount()}:count: participants`,
  );

  /**
   * Property messages
   * @readonly
   *
   * @description
   * The thread as the surface draws it: bodies rendered, authors named, and
   * the reader's own messages marked along with anything still unsent.
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
        unknownMemberLabel: this.unknownMemberLabel,
      }),
  );

  /**
   * Property mentionCandidates
   * @readonly
   *
   * @description
   * Who can be mentioned here: the channel's own participants, resolved
   * through the directory. The directory holds the whole organization, but a
   * mention creates an inbox item — offering someone outside the channel
   * would notify them about a room they cannot open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly mentionCandidates: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => {
      if (!this.directory.isAvailable()) return [];

      const directory: ReadonlyMap<string, MemberDirectoryEntry> = this.directory.byId();

      return this.participantsStore
        .participants()
        .map((participant: ChannelParticipantOutput): MemberDirectoryEntry | undefined =>
          directory.get(participant.memberId),
        )
        .filter((member: MemberDirectoryEntry | undefined): member is MemberDirectoryEntry =>
          Boolean(member),
        );
    },
  );

  /**
   * Property participantViews
   * @readonly
   *
   * @description
   * The roster the participants sheet draws, each row resolved to a name
   * and a face — never a raw member id.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ChannelParticipantView[]>}
   */
  protected readonly participantViews: Signal<readonly ChannelParticipantView[]> = computed(
    (): readonly ChannelParticipantView[] =>
      this.participantsStore.participants().map((participant: ChannelParticipantOutput) => {
        const entry: MemberDirectoryEntry | undefined = this.directory.isAvailable()
          ? this.directory.byId().get(participant.memberId)
          : undefined;

        return {
          memberId: participant.memberId,
          displayName: entry?.displayName ?? this.unknownMemberLabel,
          avatarUrl: entry?.avatarUrl,
          isResolved: entry !== undefined,
          role: participant.role,
          source: participant.source,
        };
      }),
  );

  /**
   * Property addableMembers
   * @readonly
   *
   * @description
   * Organization members not already in the channel, offered by the
   * participants sheet for adding.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly addableMembers: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => {
      if (!this.directory.isAvailable()) return [];

      const existing: ReadonlySet<string> = new Set<string>(
        this.participantsStore.participants().map((participant) => participant.memberId),
      );

      return [...this.directory.byId().values()]
        .filter(
          (member: MemberDirectoryEntry): boolean =>
            member.isActive && !existing.has(member.memberId),
        )
        .toSorted((first: MemberDirectoryEntry, second: MemberDirectoryEntry): number =>
          first.displayName.localeCompare(second.displayName),
        );
    },
  );

  /**
   * Property parentOptions
   * @readonly
   *
   * @description
   * Root channels other than this one, offered as candidate parents in the
   * edit dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  protected readonly parentOptions: Signal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = computed((): ReadonlyArray<{ readonly value: string; readonly label: string }> =>
    this.channels
      .rootChannels()
      .filter((candidate: ChannelOutput): boolean => candidate.id !== this.channelId())
      .map((candidate: ChannelOutput) => ({ value: candidate.id, label: `#${candidate.name}` })),
  );

  /**
   * Property currentParentId
   * @readonly
   *
   * @description
   * This channel's current parent, or `null` at the top level.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly currentParentId: Signal<string | null> = computed((): string | null => {
    const parent: string | undefined = this.channel()?.parent;

    return parent === undefined ? null : this.trailingSegmentOf(parent);
  });

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the reader may post here. Reading a channel does not grant it,
   * so the composer is gated separately from the route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed((): boolean =>
    this.hasPermission(ORGANIZATION_PERMISSION.MESSAGING_WRITE),
  );

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Whether the reader may administer this channel — rename it, move it,
   * manage its roster, delete it. Never assumed from being able to post.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed((): boolean =>
    this.hasPermission(ORGANIZATION_PERMISSION.MESSAGING_MANAGE),
  );

  /**
   * Property composerPlaceholder
   * @readonly
   *
   * @description
   * Prompt naming the channel, once its name is known.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly composerPlaceholder: Signal<string> = computed((): string =>
    this.channel() === null
      ? $localize`:@@messages.composer.placeholder:Write a message`
      : $localize`:@@channels.room.composerPlaceholder:Message ${this.channelName()}:name:`,
  );

  /**
   * Property loadErrorMessage
   * @readonly
   *
   * @description
   * Why the channel could not be read, or `null` when it could.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly loadErrorMessage: Signal<string | null> = computed(
    (): string | null => this.thread.loadError()?.message ?? null,
  );

  /**
   * Property editDialogVisible
   * @readonly
   *
   * @description
   * Whether the rename/move dialog is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly editDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property participantsSheetVisible
   * @readonly
   *
   * @description
   * Whether the participants sheet is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly participantsSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property deletePending
   * @readonly
   *
   * @description
   * Whether the delete confirmation is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly deletePending: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property deleteGate
   * @readonly
   *
   * @description
   * The delete confirmation's claim on the shared mutation state, scoping
   * {@link deleteDialogBusy} and {@link deleteDialogError} to a delete
   * actually confirmed here — `ChannelsStore` shares one `mutationCallState`
   * across rename, move and delete.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {SubmissionGate}
   */
  private readonly deleteGate: SubmissionGate = inject<SubmissionGateService>(
    SubmissionGateService,
  ).create(this.channels.mutationCallState);

  /**
   * Property deleteDialogBusy
   * @readonly
   *
   * @description
   * Whether the confirmed delete write is in flight, busy-disabling the
   * dialog's footer and blocking Escape/backdrop dismissal.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly deleteDialogBusy: Signal<boolean> = this.deleteGate.isBusy;

  /**
   * Property deleteDialogError
   * @readonly
   *
   * @description
   * The delete write's own error, scoped to a delete actually confirmed this
   * session.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<StoreError | null>}
   */
  protected readonly deleteDialogError: Signal<StoreError | null> = this.deleteGate.error;

  /**
   * Property favoritePending
   * @readonly
   *
   * @description
   * Whether the favorite toggle is mid-flight, which locks the control
   * against a double press.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly favoritePending: WritableSignal<boolean> = signal<boolean>(false);

  private readonly conversations: ConversationService =
    inject<ConversationService>(ConversationService);

  private readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  private readonly router: Router = inject<Router>(Router);

  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  private readonly events: Events = inject<Events>(Events);

  private readonly document: Document = inject<Document>(DOCUMENT);

  /** Stands in wherever a member cannot be named. Never a raw id. */
  private readonly unknownMemberLabel: string = $localize`:@@messages.unknownMember:Unknown member`;

  /** Stands in for the channel's own name while it has not resolved. */
  private readonly unknownChannelLabel: string = $localize`:@@route.channel:Channel`;

  /**
   * Property favoriteOnLabel
   * @readonly
   *
   * @description
   * Accessible name of the favorite toggle while the channel is favorited.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly favoriteOnLabel: string = $localize`:@@channels.room.unfavorite:Remove from favorites`;

  /**
   * Property favoriteOffLabel
   * @readonly
   *
   * @description
   * Accessible name of the favorite toggle while the channel is not
   * favorited.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly favoriteOffLabel: string = $localize`:@@channels.room.favorite:Add to favorites`;
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Wires the routed channel to the thread and the roster. The order
   * matters: both stores survive a channel change, since the router reuses
   * this page when only `:channelId` changes, so each is emptied before the
   * new channel is read.
   *
   * `channels.loadOne` runs alongside the thread load rather than being left
   * to the list: it is the only read reporting a trustworthy `unreadCount`
   * and `isFavorite`, and a member can land here on a deep link the list was
   * never fetched for.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const channelId: string = this.channelId();
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      untracked((): void => {
        this.thread.reset();
        this.thread.load(channelId);
        this.thread.connect(channelId);
        this.thread.markRead({ conversationId: channelId });

        this.channels.loadOne(channelId);

        this.participantsStore.reset();
        this.participantsStore.load(channelId);

        if (organizationId !== null) this.directory.ensureLoaded(organizationId);
      });
    });

    this.events
      .on(channelsStoreEvents.deleted)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }: { payload: string }): void => {
        if (payload !== this.channelId()) return;

        void this.router.navigate(['..'], { relativeTo: this.route });
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Posts a message to the open channel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} body - The written message.
   *
   * @returns {void}
   */
  protected send(body: string): void {
    this.thread.send({ conversationId: this.channelId(), input: { body } });
  }

  /**
   * Method toggleReaction
   * @method toggleReaction
   *
   * @description
   * Adds or withdraws the reader's reaction.
   *
   * @access protected
   * @since 1.0.0
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
   * Moves the read marker once the newest message is on screen, and only
   * while the tab is actually being looked at.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected markRead(): void {
    if (this.document.visibilityState !== 'visible') return;

    this.thread.markRead({ conversationId: this.channelId() });
  }

  /**
   * Method toggleFavorite
   * @method toggleFavorite
   *
   * @description
   * Favorites or unfavorites the channel. `ChannelsStore.loadOne` folds the
   * confirmed state back into the shared entity, so the list picks it up
   * without a manual patch — the write response itself is not trusted, since
   * every channel write fabricates `isFavorite`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected toggleFavorite(): void {
    const channel: ChannelOutput | null = this.channel();

    if (channel === null || this.favoritePending()) return;

    const channelId: string = this.channelId();

    this.favoritePending.set(true);

    const request: Observable<unknown> = channel.isFavorite
      ? this.conversations.unfavorite(channelId)
      : this.conversations.favorite(channelId);

    request.subscribe({
      next: (): void => {
        this.favoritePending.set(false);
        this.channels.loadOne(channelId);
      },
      error: (): void => this.favoritePending.set(false),
    });
  }

  /**
   * Method submitEdit
   * @method submitEdit
   *
   * @description
   * Applies only what actually changed: a rename and a move are independent
   * writes, and sending either unchanged would be a request with nothing to
   * say.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ChannelEditDraft} draft - The validated name and parent.
   *
   * @returns {void}
   */
  protected submitEdit(draft: ChannelEditDraft): void {
    const channel: ChannelOutput | null = this.channel();

    if (channel === null) return;

    const channelId: string = this.channelId();

    if (draft.name !== channel.name) {
      this.channels.update({ channelId, input: { name: draft.name } });
    }

    if (draft.parentChannelId !== this.currentParentId()) {
      this.channels.setParent({ channelId, input: { parentChannelId: draft.parentChannelId } });
    }
  }

  /**
   * Method requestDelete
   * @method requestDelete
   *
   * @description
   * Opens the delete confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestDelete(): void {
    this.deleteGate.reset();
    this.deletePending.set(true);
  }

  /**
   * Method confirmDelete
   * @method confirmDelete
   *
   * @description
   * Sends the delete write. Navigation back to the channel list happens once
   * `ChannelsStore` reports the deletion, via the constructor's event
   * subscription; a failure surfaces inline through {@link deleteDialogError}
   * instead, leaving the dialog open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirmDelete(): void {
    this.deleteGate.submit();
    this.channels.remove(this.channelId());
  }

  /**
   * Method onDeleteDialogStateChanged
   * @method onDeleteDialogStateChanged
   *
   * @description
   * Clears the pending flag on any dismissal — Cancel, the backdrop or
   * Escape.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onDeleteDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.deletePending.set(false);
    this.deleteGate.reset();
  }

  /**
   * Method addParticipant
   * @method addParticipant
   *
   * @description
   * Adds a member to the channel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - Bare member id.
   *
   * @returns {void}
   */
  protected addParticipant(memberId: string): void {
    this.participantsStore.add({ channelId: this.channelId(), input: { memberId } });
  }

  /**
   * Method removeParticipant
   * @method removeParticipant
   *
   * @description
   * Removes a member from the channel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - Bare member id.
   *
   * @returns {void}
   */
  protected removeParticipant(memberId: string): void {
    this.participantsStore.remove({ channelId: this.channelId(), memberId });
  }

  /**
   * Method trailingSegmentOf
   * @method trailingSegmentOf
   *
   * @description
   * The last path segment of an IRI — the bare id every write to this
   * feature's endpoints needs.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} iri - The IRI to read the id off.
   *
   * @returns {string} The trailing segment.
   */
  private trailingSegmentOf(iri: string): string {
    return iri.slice(iri.lastIndexOf('/') + 1);
  }

  /**
   * Method hasPermission
   * @method hasPermission
   *
   * @description
   * Whether the reader holds a grant, honouring a namespace wildcard such as
   * `organization.*` — an owner holds that rather than the leaf permission.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {OrganizationPermissionName} required - The grant to look for.
   *
   * @returns {boolean} Whether it is granted.
   */
  private hasPermission(required: OrganizationPermissionName): boolean {
    return this.memberAccess
      .permissions()
      .some(
        (granted: string): boolean =>
          granted === required ||
          (granted.endsWith('.*') && required.startsWith(granted.slice(0, -1))),
      );
  }
  //#endregion
}
