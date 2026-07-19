import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  effect,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import type { MessageOutput } from '@features/organization/features/messaging/models';
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
  imports: [FormsModule, ButtonModule, TextareaModule, MessageThread, EmptyState],
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
      this.draft().trim().length > 0 &&
      !this.store.isSending() &&
      this.store.activeConversation() !== null,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Loads the conversation list.
   *
   * @since 1.0.0
   */
  public constructor() {
    this.store.loadConversations();
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

    // The URL is the source of truth for which thread is open, so a shared link
    // and a reload both land on the same conversation.
    const deepLinked: string | null = this.route.snapshot.queryParamMap.get('conversation');
    if (deepLinked !== null) {
      this.store.selectConversation(deepLinked);
    }
  }
  //#endregion

  //#region Methods
  /**
   * Method open
   *
   * @description
   * Opens a conversation and clears any half-typed draft, which belonged to the
   * previous thread.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} conversationId - The conversation to open.
   *
   * @returns {void}
   */
  protected open(conversationId: string): void {
    // Opened directly rather than waiting for the URL to round-trip: query-param
    // input binding is not guaranteed to have flushed by the time the user
    // expects the thread, and the effect below is a no-op once the ids match.
    this.draft.set('');
    this.store.selectConversation(conversationId);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { conversation: conversationId },
      queryParamsHandling: 'merge',
    });
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

    this.store.send(this.draft());
    this.draft.set('');
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
