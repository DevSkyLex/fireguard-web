import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  effect,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, skip } from 'rxjs';
import { SHELL_PANEL_PORT, type ShellPanelPort } from '@core/shell-panel';
import { ASSISTANT_PANEL_ID } from '@features/organization/features/assistant/providers';
import { toMemberId } from '@features/organization/features/messaging/data-access';
import type {
  ConversationOutput,
  MessageOutput,
} from '@features/organization/features/messaging/models';
import { CONVERSATION_DETAILS_PANEL_ID } from '@features/organization/features/messaging/providers';
import { MessageDraftService } from '@features/organization/features/messaging/services';
import { ConversationInventoryStore } from '@features/organization/features/messaging/state';
import {
  MessagingWorkspaceStore,
  type MessagingWorkspaceStoreType,
} from '@features/organization/features/messaging/state';
import {
  MessageComposer,
  MessageThread,
} from '@features/organization/features/messaging/ui/components';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
  OrganizationMemberDirectoryStore,
  type MemberIdentity,
  type OrganizationMemberDirectoryStoreType,
} from '@features/organization/state';
import { EmptyState } from '@shared/components';

/**
 * Component MessagingPage
 * @class MessagingPage
 *
 * @description
 * The collaboration workspace: conversations on the left, the active thread and
 * its composer on the right.
 *
 * Geometry is ported from the design system's workspace kit — a 266px
 * conversation column, a 22/24px thread rhythm and a composer inset from the
 * thread's edges.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-messaging',
  imports: [ButtonModule, TooltipModule, MessageComposer, MessageThread, EmptyState],
  // The page is a full-height two-pane workspace, so its host must stretch;
  // left to its default `display: inline` it collapses and the panes shrink to
  // their content.
  host: { class: 'flex min-h-0 flex-1' },
  providers: [MessagingWorkspaceStore],
  templateUrl: './messaging.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingPage {
  //#region Inputs
  /**
   * Input conversation
   * @readonly
   *
   * @description
   * The open conversation, bound from `?conversation=`. Keeping it in the URL
   * is what makes a thread linkable and restorable on reload — before this it
   * lived only in store state.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly conversation: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MessagingWorkspaceStoreType}
   */
  protected readonly store: MessagingWorkspaceStoreType =
    inject<MessagingWorkspaceStoreType>(MessagingWorkspaceStore);

  /**
   * Property directory
   * @readonly
   *
   * @description
   * Resolves message authors — the API sends bare member ids.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationMemberDirectoryStoreType}
   */
  protected readonly directory: OrganizationMemberDirectoryStoreType =
    inject<OrganizationMemberDirectoryStoreType>(OrganizationMemberDirectoryStore);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 2.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Supplies the signed-in member's id, so a reaction can tell your own from
   * someone else's.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationMemberAccessStore}
   */
  protected readonly memberAccess: OrganizationMemberAccessStore =
    inject<OrganizationMemberAccessStore>(OrganizationMemberAccessStore);

  /**
   * Property draft
   *
   * @description
   * The composer's text. Local to the page — a draft that has not been sent is
   * not conversation state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly draft: WritableSignal<string> = signal<string>('');

  /**
   * Property pendingFile
   *
   * @description
   * A file staged for the next message, if any.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {WritableSignal<File | null>}
   */
  protected readonly pendingFile: WritableSignal<File | null> = signal<File | null>(null);

  /**
   * Property replyDraft
   *
   * @description
   * The thread panel's composer text, separate from the main one — switching
   * panes must not swallow either draft.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly replyDraft: WritableSignal<string> = signal<string>('');

  /**
   * Property replyPlaceholder
   * @readonly
   *
   * @description
   * The reply composer's prompt. A constant rather than a template literal
   * because the composer takes its placeholder as an input.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {string}
   */
  protected readonly replyPlaceholder: string = $localize`:@@messaging.replies.placeholder:Reply…`;

  /**
   * Property mentionableMembers
   * @readonly
   *
   * @description
   * The directory as a list, for the composer's mention popover. The store
   * keys by id for lookup; the popover needs to iterate.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<readonly MemberIdentity[]>}
   */
  protected readonly mentionableMembers: Signal<readonly MemberIdentity[]> = computed(
    (): readonly MemberIdentity[] => Array.from(this.directory.identities().values()),
  );

  /**
   * Property confirmationService
   * @readonly
   *
   * @access private
   * @since 5.0.0
   *
   * @type {ConfirmationService}
   */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);

  /**
   * Property canManageMessages
   * @readonly
   *
   * @description
   * Whether the member may delete someone else's message. Editing is not
   * covered: the backend reserves that to the author whatever the permissions.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManageMessages: Signal<boolean> = computed((): boolean => {
    const granted: ReadonlySet<string> = new Set(this.memberAccess.permissions());

    return (
      granted.has(ORGANIZATION_PERMISSION.MESSAGING_MANAGE) ||
      Array.from(granted).some(
        (permission: string): boolean =>
          permission.endsWith('.*') &&
          ORGANIZATION_PERMISSION.MESSAGING_MANAGE.startsWith(permission.slice(0, -1)),
      )
    );
  });

  /**
   * Property canSend
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSend: Signal<boolean> = computed(
    (): boolean =>
      (this.draft().trim().length > 0 || this.pendingFile() !== null) &&
      !this.store.isSending() &&
      this.store.activeConversation() !== null,
  );
  //#endregion

  /**
   * Property draftService
   * @readonly
   *
   * @description
   * Per-conversation draft persistence. The composer autosaves through it
   * (debounced), `open` restores the target conversation's draft, and a
   * successful send clears it.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {MessageDraftService}
   */
  private readonly draftService: MessageDraftService =
    inject<MessageDraftService>(MessageDraftService);

  /**
   * Property shellPanel
   * @readonly
   *
   * @description
   * Shell panel port — how a routed page opens the right-hand region without
   * importing the layout, which §5 forbids.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {ShellPanelPort}
   */
  private readonly shellPanel: ShellPanelPort = inject<ShellPanelPort>(SHELL_PANEL_PORT);

  /**
   * Property inventory
   * @readonly
   *
   * @description
   * Shared conversation list, used here to resolve a nested channel's parent
   * name and to flip the favorite flag.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {InstanceType<typeof ConversationInventoryStore>}
   */
  private readonly inventory: InstanceType<typeof ConversationInventoryStore> = inject(
    ConversationInventoryStore,
  );

  /**
   * Property isDetailsPanelOpen
   * @readonly
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isDetailsPanelOpen: Signal<boolean> = computed((): boolean =>
    this.shellPanel.openPanelIds().includes(CONVERSATION_DETAILS_PANEL_ID),
  );

  /**
   * Property parentChannelName
   * @readonly
   *
   * @description
   * Name of the open channel's parent, when it is nested — the prototype puts
   * it before the channel name as a path.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly channelAncestry: Signal<readonly string[]> = computed(
    (): readonly string[] => {
      const conversations: readonly ConversationOutput[] = this.inventory.conversations();
      const names: string[] = [];

      let parentId: string | null | undefined =
        this.store.activeConversation()?.parentConversationId;

      // Bounded by the conversations actually known: a cycle in the data — or a
      // parent pointing outside the list — must not spin here.
      const seen = new Set<string>();

      while (parentId && !seen.has(parentId)) {
        seen.add(parentId);

        const parent: ConversationOutput | undefined = conversations.find(
          (candidate: ConversationOutput): boolean => candidate.id === parentId,
        );
        if (!parent) break;

        names.unshift(parent.name ?? '');
        parentId = parent.parentConversationId;
      }

      return names.filter((name: string): boolean => name.length > 0);
    },
  );

  /**
   * Property isCounterpartOnline
   * @readonly
   *
   * @description
   * Whether the person on the other side of a direct conversation is online.
   *
   * The counterpart is derived from the thread's authors rather than read from
   * the conversation: `ConversationOutput` carries no participant for a direct
   * conversation — `subject` and `subjectLabel` are both null. So this only
   * answers once they have written something, which is also the only case
   * where the header shows their initials.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isCounterpartOnline: Signal<boolean> = computed((): boolean => {
    if (this.store.activeConversation()?.isChannel !== false) return false;

    const self: string | null = this.memberAccess.currentMemberId();
    const online: ReadonlySet<string> = this.store.onlineMembers();

    return this.store.messages().some((message: MessageOutput): boolean => {
      const author: string = toMemberId(message.authorMember);

      return author !== self && online.has(author);
    });
  });

  /**
   * Property conversationInitials
   * @readonly
   *
   * @description
   * Initial shown in place of an avatar for a direct conversation.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<string>}
   */
  /**
   * Property composerPlaceholder
   * @readonly
   *
   * @description
   * Names what is being written to — `Message #general`, or the person for a
   * direct conversation. The kit computes this rather than showing one generic
   * prompt: with several threads open in a day, the field is the last thing
   * confirming which one has focus.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly composerPlaceholder: Signal<string> = computed((): string => {
    const conversation: ConversationOutput | null = this.store.activeConversation();
    const label: string = (conversation?.name ?? conversation?.subjectLabel ?? '').trim();

    if (label.length === 0) return $localize`:@@messaging.composer.placeholder:Write a message…`;

    return conversation?.isChannel === true
      ? $localize`:@@messaging.composer.placeholderChannel:Message #${label}:channel:`
      : $localize`:@@messaging.composer.placeholderDirect:Message ${label}:member:`;
  });

  protected readonly conversationInitials: Signal<string> = computed((): string => {
    const conversation: ConversationOutput | null = this.store.activeConversation();
    const label: string = conversation?.name ?? conversation?.subjectLabel ?? '';

    return label.trim().charAt(0).toUpperCase() || '?';
  });

  //#region Lifecycle
  /**
   * Wires the member directory, presence and draft autosave. The conversation
   * list itself is NOT loaded here: the shared ConversationInventoryStore
   * owns it and follows the active organization on its own — this page and
   * the shell sidebar read the same instance.
   *
   * @since 1.0.0
   */
  public constructor() {
    // Debounced autosave (plan 3.4: localStorage, 400ms). `skip(1)` leaves
    // the initial empty emission alone, and the destroy hook below flushes
    // whatever the debounce has not written yet.
    toObservable(this.draft)
      .pipe(skip(1), debounceTime(400), takeUntilDestroyed())
      .subscribe((body: string): void => this.persistDraft(body));

    inject(DestroyRef).onDestroy((): void => this.persistDraft(this.draft()));

    this.directory.load(
      computed(
        (): string | null => this.activeOrganizationStore.selectedOrganization()?.id ?? null,
      ),
    );

    /**
     * Presence for the authors currently on screen. The API has no
     * "list all online" mode, so the ids are derived from the thread.
     */
    // Announce this member as online for as long as the workspace is open.
    // Nothing did before, so the app read everyone else's presence while never
    // publishing its own.
    this.store.publishPresence(true);

    effect((): void => {
      const organizationId: string | undefined =
        this.activeOrganizationStore.selectedOrganization()?.id;
      const authorIds: readonly string[] = [
        ...new Set(
          // The payload carries member IRIs; the presence endpoint wants ids.
          this.store
            .messages()
            .map((message: MessageOutput): string => toMemberId(message.authorMember)),
        ),
      ];

      if (organizationId === undefined || authorIds.length === 0) return;

      untracked((): void => {
        this.store.loadPresence({
          organization: `/api/organizations/${organizationId}`,
          memberIds: authorIds,
        });
      });
    });

    /**
     * The URL is the source of truth for which thread is open: a shared link,
     * a reload AND an in-page navigation (the shell sidebar's channel rows
     * link here with `?conversation=`) must all land on the same thread. The
     * snapshot-only read this replaces handled the first two and silently
     * ignored the third. `open()` pre-sets the same state for direct clicks,
     * so the effect no-ops once the ids already match.
     */
    effect((): void => {
      const target: string | null = this.conversation();

      if (target === null || target === untracked(this.store.activeConversationId)) {
        return;
      }

      untracked((): void => {
        this.persistDraft(this.draft());
        this.pendingFile.set(null);
        this.store.selectConversation(target);
        this.restoreDraft(target);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method open
   *
   * @description
   * Opens a conversation. The half-typed draft is not lost: it is persisted
   * to the conversation it belongs to, and the target conversation's own
   * stored draft comes back into the composer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} conversationId - The conversation to open.
   *
   * @returns {void}
   */
  /**
   * Method toggleDetailsPanel
   *
   * @description
   * Shows or hides the shell's conversation details panel.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected toggleDetailsPanel(): void {
    this.shellPanel.toggle(CONVERSATION_DETAILS_PANEL_ID);
  }

  /**
   * Method toggleFavorite
   *
   * @description
   * Flips the conversation's favorite flag — sidebar ordering only, never an
   * access decision.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {ConversationOutput} conversation - The open conversation.
   *
   * @returns {void}
   */
  protected toggleFavorite(conversation: ConversationOutput): void {
    this.inventory.toggleFavorite(conversation);
  }

  /**
   * Method persistDraft
   *
   * @description
   * Writes the composer text to the ACTIVE conversation's stored draft; a
   * blank body clears the entry.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {string} body - Current composer text.
   *
   * @returns {void}
   */
  private persistDraft(body: string): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    const conversationId: string | null = this.store.activeConversationId();

    if (organizationId !== undefined && conversationId !== null) {
      this.draftService.write(organizationId, conversationId, body);
    }
  }

  /**
   * Method restoreDraft
   *
   * @description
   * Puts a conversation's stored draft back into the composer.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {string} conversationId - The conversation being opened.
   *
   * @returns {void}
   */
  private restoreDraft(conversationId: string): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;

    this.draft.set(
      organizationId === undefined ? '' : this.draftService.read(organizationId, conversationId),
    );
  }

  /**
   * Method send
   *
   * @description
   * Posts the draft and clears the composer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  /**
   * Method toggleReaction
   *
   * @description
   * Adds or removes the signed-in member's reaction on a message.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {{ message: MessageOutput; emoji: string }} event - The chip that was pressed.
   *
   * @returns {void}
   */
  protected toggleReaction(event: {
    readonly message: MessageOutput;
    readonly emoji: string;
  }): void {
    this.store.toggleReaction(event);
  }

  /**
   * Method togglePin
   *
   * @description
   * Pins or unpins a message for the whole conversation.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {MessageOutput} message - The message to pin.
   *
   * @returns {void}
   */
  /**
   * Method openThread
   *
   * @description
   * Opens a message's replies in the side panel.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {MessageOutput} message - The thread root.
   *
   * @returns {void}
   */
  protected openThread(message: MessageOutput): void {
    this.replyDraft.set('');
    this.store.openThread(message.id);
  }

  /**
   * Method closeThread
   *
   * @access protected
   * @since 4.0.0
   *
   * @returns {void}
   */
  protected closeThread(): void {
    this.replyDraft.set('');
    this.store.openThread(null);
  }

  /**
   * Method sendReply
   *
   * @access protected
   * @since 4.0.0
   *
   * @returns {void}
   */
  protected sendReply(): void {
    if (this.replyDraft().trim().length === 0) return;

    this.store.reply(this.replyDraft());
    this.replyDraft.set('');
  }

  protected togglePin(message: MessageOutput): void {
    this.store.setPinned({ message, pinned: message.pinnedAt === null });
  }

  /**
   * Method toggleSave
   *
   * @description
   * Adds or removes a message from the member's own saved list.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {MessageOutput} message - The message to save.
   *
   * @returns {void}
   */
  protected toggleSave(message: MessageOutput): void {
    this.store.setSaved({ message, saved: !message.isSaved });
  }

  protected send(): void {
    if (!this.canSend()) return;

    this.store.send({ body: this.draft(), file: this.pendingFile() });
    this.draft.set('');
    this.pendingFile.set(null);
    // The message left the composer: its stored draft has served its purpose.
    this.persistDraft('');
  }

  /**
   * Method clearFile
   *
   * @access protected
   * @since 4.0.0
   *
   * @returns {void}
   */
  protected clearFile(): void {
    this.pendingFile.set(null);
  }

  /**
   * Method discardDraft
   *
   * @description
   * Drops the draft and its staged attachment, and clears what was persisted so
   * reopening the conversation comes back empty.
   *
   * @access protected
   * @since 5.0.0
   *
   * @returns {void}
   */
  /**
   * Method openAssistant
   *
   * @description
   * Opens the assistant beside the thread, from the composer's sparkles
   * action. The panel answers from the conversation on screen, so it is opened
   * rather than navigated to.
   *
   * @access protected
   * @since 5.0.0
   *
   * @returns {void}
   */
  protected openAssistant(): void {
    this.shellPanel.open(ASSISTANT_PANEL_ID);
  }

  /**
   * Method editMessage
   *
   * @description
   * Rewrites a message. The backend allows this to its author only, so the
   * thread offers the action to nobody else.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {{ message: MessageOutput; body: string }} request - What to rewrite.
   *
   * @returns {void}
   */
  protected editMessage(request: { readonly message: MessageOutput; readonly body: string }): void {
    this.store.editMessage(request);
  }

  /**
   * Method confirmDeleteMessage
   *
   * @description
   * Deleting is irreversible from the reader's side, so it is confirmed. The
   * page owns the prompt rather than the thread component, which stays
   * presentational.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {MessageOutput} message - The message to delete.
   *
   * @returns {void}
   */
  protected confirmDeleteMessage(message: MessageOutput): void {
    this.confirmationService.confirm({
      header: $localize`:@@messaging.thread.deleteHeader:Delete message`,
      message: $localize`:@@messaging.thread.deleteConfirm:Delete this message? Its replies and reactions stay, but the text is gone for everyone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@messaging.thread.delete:Delete`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: (): void => {
        this.store.deleteMessage(message);
      },
    });
  }

  protected discardDraft(): void {
    this.draft.set('');
    this.pendingFile.set(null);
    this.persistDraft('');
  }
  //#endregion
}
