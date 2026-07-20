import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import type { MessageOutput } from '@features/organization/features/messaging/models';
import { SavedMessagesStore } from '@features/organization/features/messaging/state';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  OrganizationMemberDirectoryStore,
  type OrganizationMemberDirectoryStoreType,
} from '@features/organization/state/organization-member-directory';
import { EmptyState, ErrorState } from '@shared/components';

/**
 * Component SavedMessagesPage
 * @class SavedMessagesPage
 *
 * @description
 * The member's Saved items: every message they bookmarked across the
 * organization, most recently saved first. Each row jumps into its
 * conversation, and unsaving removes it optimistically.
 *
 * A deleted message keeps its row (`body: null`) — the bookmark is the
 * member's, the deletion is the author's, and silently dropping the row
 * would look like a lost bookmark.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-saved-messages-page',
  imports: [DatePipe, ButtonModule, SkeletonModule, EmptyState, ErrorState],
  providers: [SavedMessagesStore],
  templateUrl: './saved-messages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedMessagesPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof SavedMessagesStore>}
   */
  protected readonly store: InstanceType<typeof SavedMessagesStore> = inject(SavedMessagesStore);

  /**
   * Property directory
   * @readonly
   *
   * @description
   * Member directory resolving author identities for each row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationMemberDirectoryStoreType}
   */
  protected readonly directory: OrganizationMemberDirectoryStoreType = inject(
    OrganizationMemberDirectoryStore,
  );

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property organizationId
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  private readonly organizationId: Signal<string | null> = computed(
    (): string | null => this.activeOrganizationStore.selectedOrganization()?.id ?? null,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Loads the saved list and the author directory for the active
   * organization.
   *
   * @since 1.0.0
   */
  public constructor() {
    this.store.load(this.organizationId);
    this.directory.load(this.organizationId);
  }
  //#endregion

  //#region Methods
  /**
   * Method authorName
   *
   * @description
   * The author's display name, or the bare id while the directory loads.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageOutput} message - The row's message.
   *
   * @returns {string} Display name.
   */
  protected authorName(message: MessageOutput): string {
    return this.directory.identities().get(message.authorMember)?.displayName ?? '';
  }

  /**
   * Method openConversation
   *
   * @description
   * Jumps into the message's conversation in the workspace.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageOutput} message - The row's message.
   *
   * @returns {void}
   */
  protected openConversation(message: MessageOutput): void {
    this.router.navigate(['..'], {
      relativeTo: this.route,
      queryParams: { conversation: this.conversationIdOf(message) },
    });
  }

  /**
   * Method retry
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.store.load(this.organizationId());
  }

  /**
   * Method conversationIdOf
   *
   * @description
   * The bare conversation id — the transport field is an IRI.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {MessageOutput} message - The row's message.
   *
   * @returns {string} Conversation identifier.
   */
  private conversationIdOf(message: MessageOutput): string {
    const segments: string[] = message.conversation.split('/');
    return segments[segments.length - 1] ?? message.conversation;
  }
  //#endregion
}
