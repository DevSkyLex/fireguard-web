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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, skip } from 'rxjs';
import { SHELL_PANEL_PORT, type ShellPanelPort } from '@core/shell-panel';
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
import { MessageThread } from '@features/organization/features/messaging/ui/components';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
  OrganizationMemberDirectoryStore,
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
  imports: [FormsModule, ButtonModule, TextareaModule, TooltipModule, MessageThread, EmptyState],
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
   * Property router
   * @readonly
   *
   * @access private
   * @since 3.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @access private
   * @since 3.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
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
  protected readonly parentChannelName: Signal<string | null> = computed((): string | null => {
    const parentId: string | null | undefined =
      this.store.activeConversation()?.parentConversationId;
    if (!parentId) return null;

    return (
      this.inventory
        .conversations()
        .find((candidate: ConversationOutput): boolean => candidate.id === parentId)?.name ?? null
    );
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
    effect((): void => {
      const organizationId: string | undefined =
        this.activeOrganizationStore.selectedOrganization()?.id;
      const authorIds: readonly string[] = [
        ...new Set(
          this.store.messages().map((message: MessageOutput): string => message.authorMember),
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

  protected open(conversationId: string): void {
    // Opened directly rather than waiting for the URL to round-trip: query-param
    // input binding is not guaranteed to have flushed by the time the user
    // expects the thread, and the effect below is a no-op once the ids match.
    this.persistDraft(this.draft());
    this.pendingFile.set(null);
    this.store.selectConversation(conversationId);
    this.restoreDraft(conversationId);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { conversation: conversationId },
      queryParamsHandling: 'merge',
    });
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
    const currentMemberId: string | null = this.memberAccess.currentMemberId();
    if (currentMemberId === null) return;

    this.store.toggleReaction({ ...event, currentMemberId });
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

  /**
   * Method onReplyKeydown
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {KeyboardEvent} event - The keydown event.
   *
   * @returns {void}
   */
  protected onReplyKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    this.sendReply();
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
   * Method onFileSelected
   *
   * @description
   * Stages the chosen file for the next message.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {Event} event - The file input change event.
   *
   * @returns {void}
   */
  protected onFileSelected(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.pendingFile.set(target.files?.[0] ?? null);
    target.value = '';
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
   * Method onComposerKeydown
   *
   * @description
   * Enter sends, Shift+Enter breaks the line — the convention every chat client
   * shares, and the one users will try first.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - The keydown event.
   *
   * @returns {void}
   */
  protected onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    this.send();
  }
  //#endregion
}
