import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBookmark, lucideBookmarkX } from '@ng-icons/lucide';
import type {
  ConversationOutput,
  MessageOutput,
} from '@features/organization/features/collaboration/models';
import {
  SavedMessagesStore,
  type SavedMessagesStoreType,
} from '@features/organization/features/collaboration/state';
import { renderMessageBodyHtml } from '@features/organization/features/collaboration/utils';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { SavedMessageItem } from './models';

/**
 * Component SavedMessagesPage
 * @class SavedMessagesPage
 *
 * @description
 * The reader's saved messages across the open organization — private
 * bookmarks, listed newest-loaded-first as the API returns them, each linking
 * into the conversation it lives in.
 *
 * A bookmark in a channel links to the channel route and one in a direct
 * conversation to the messages route; the store resolves each conversation
 * once to tell them apart, and an unresolvable one falls back to the direct
 * route, which still opens the thread — channel and conversation share an id.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-saved-messages-page',
  imports: [NgIcon, RouterLink, EmptyState, ErrorState, HlmButton, HlmSkeleton],
  providers: [SavedMessagesStore, provideIcons({ lucideBookmark, lucideBookmarkX })],
  templateUrl: './saved-messages-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedMessagesPage {
  //#region Properties
  /**
   * Property saved
   * @readonly
   *
   * @description
   * The bookmarks, their paging, and the conversations they point into.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {SavedMessagesStoreType}
   */
  protected readonly saved: SavedMessagesStoreType =
    inject<SavedMessagesStoreType>(SavedMessagesStore);

  /**
   * Property items
   * @readonly
   *
   * @description
   * The bookmarks as the page draws them: rendered, named and linked.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly SavedMessageItem[]>}
   */
  protected readonly items: Signal<readonly SavedMessageItem[]> = computed(
    (): readonly SavedMessageItem[] => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();
      const conversations = this.saved.conversationsById();

      return this.saved.savedMessageEntities().map((message: MessageOutput): SavedMessageItem => {
        const conversationId: string = message.conversation.slice(
          message.conversation.lastIndexOf('/') + 1,
        );
        const conversation: ConversationOutput | undefined = conversations[conversationId];
        const isChannel: boolean = conversation?.isChannel === true;

        return {
          id: message.id,
          authorName: message.authorDisplayName ?? this.unknownLabel,
          createdAt: message.createdAt,
          bodyHtml: renderMessageBodyHtml(message.body, message.mentionNames, this.unknownLabel),
          isDeleted: message.isDeleted,
          conversationLabel: isChannel
            ? (conversation?.name ?? this.directLabel)
            : (conversation?.subjectLabel ?? this.directLabel),
          link: [
            '/organizations',
            organizationId ?? '',
            isChannel ? 'channels' : 'messages',
            conversationId,
          ],
        };
      });
    },
  );

  /**
   * Property loadErrorMessage
   * @readonly
   *
   * @description
   * Why the bookmarks could not be read, or `null` when they could.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly loadErrorMessage: Signal<string | null> = computed(
    (): string | null => this.saved.loadError()?.message ?? null,
  );

  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /** Stands in wherever a member cannot be named. Never a raw id. */
  private readonly unknownLabel: string = $localize`:@@messages.unknownMember:Unknown member`;

  /** Labels a bookmark whose conversation is not a named channel. */
  private readonly directLabel: string = $localize`:@@messages.saved.directConversation:Direct conversation`;
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Loads the open organization's bookmarks, reloading if the organization
   * changes underneath the route.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (organizationId === null) return;

      untracked((): void => {
        this.saved.load(organizationId);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Retries the list after a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    if (organizationId === null) return;

    this.saved.load(organizationId);
  }
  //#endregion
}
