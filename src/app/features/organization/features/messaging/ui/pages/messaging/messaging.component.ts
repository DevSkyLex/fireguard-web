import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import {
  MessagingWorkspaceStore,
  type MessagingWorkspaceStoreType,
} from '@features/organization/features/messaging/state';
import { MessageThread } from '@features/organization/features/messaging/ui/components';
import {
  ActiveOrganizationStore,
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
    this.draft.set('');
    this.store.selectConversation(conversationId);
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
