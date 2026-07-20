import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import type { ConversationOutput } from '@features/organization/features/messaging/models';
import { ConversationInventoryStore } from '@features/organization/features/messaging/state';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { buildChannelTree, type ChannelTreeNode } from './utils/channel-tree.utils';

/**
 * Component MessagingSidebar
 * @class MessagingSidebar
 *
 * @description
 * The shell sidebar's messaging sections, straight from the prototype: a
 * channel search, a collapsible Favorites section, and a collapsible Channels
 * section with parented channels indented under their parent. Every row deep
 * links into the messaging workspace (`?conversation=`), unread counts come
 * from the shared {@link ConversationInventoryStore}, and the row matching
 * the URL's open conversation is highlighted.
 *
 * Rendered through the sidebar slot's `content` region, inside the same
 * scroller as the navigation.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-messaging-sidebar',
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './messaging-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingSidebar {
  //#region Properties
  /**
   * Property inventory
   * @readonly
   *
   * @description
   * Shared conversation inventory backing every section.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof ConversationInventoryStore>}
   */
  protected readonly inventory: InstanceType<typeof ConversationInventoryStore> = inject(
    ConversationInventoryStore,
  );

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Active organization, for building the workspace links.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router, observed to highlight the conversation the URL currently opens.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property currentUrl
   * @readonly
   *
   * @description
   * The router URL as a signal, refreshed on every navigation end.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  private readonly currentUrl: Signal<string> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((): string => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Property search
   * @readonly
   *
   * @description
   * Channel search text — filters both sections by label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly search: WritableSignal<string> = signal<string>('');

  /**
   * Property favoritesOpen
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly favoritesOpen: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property channelsOpen
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly channelsOpen: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property messagesLink
   * @readonly
   *
   * @description
   * Router link to the messaging workspace of the active organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[] | null>}
   */
  protected readonly messagesLink: Signal<readonly string[] | null> = computed(
    (): readonly string[] | null => {
      const organization = this.organizationContext.selectedOrganization();
      return organization ? ['/organizations', organization.id, 'messages'] : null;
    },
  );

  /**
   * Property activeConversationId
   * @readonly
   *
   * @description
   * The conversation the URL currently opens, if any — the source of the
   * active row highlight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly activeConversationId: Signal<string | null> = computed((): string | null => {
    const url: string = this.currentUrl();
    const queryStart: number = url.indexOf('?');
    if (queryStart === -1) return null;

    return new URLSearchParams(url.slice(queryStart + 1)).get('conversation');
  });

  /**
   * Property favorites
   * @readonly
   *
   * @description
   * Favorited conversations matching the search.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ConversationOutput[]>}
   */
  protected readonly favorites: Signal<readonly ConversationOutput[]> = computed(
    (): readonly ConversationOutput[] => this.matching(this.inventory.favorites()),
  );

  /**
   * Property channelTree
   * @readonly
   *
   * @description
   * The Channels section: search-filtered channels grouped under their
   * parent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ChannelTreeNode[]>}
   */
  protected readonly channelTree: Signal<readonly ChannelTreeNode[]> = computed(
    (): readonly ChannelTreeNode[] => buildChannelTree(this.matching(this.inventory.channels())),
  );
  //#endregion

  //#region Methods
  /**
   * Method labelOf
   *
   * @description
   * A conversation's display label — channel name, or the subject label for
   * direct conversations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ConversationOutput} conversation - Conversation to label.
   *
   * @returns {string} Display label.
   */
  protected labelOf(conversation: ConversationOutput): string {
    return conversation.name ?? conversation.subjectLabel ?? '';
  }

  /**
   * Method matching
   *
   * @description
   * Filters conversations by the search text, case-insensitively.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {readonly ConversationOutput[]} conversations - Rows to filter.
   *
   * @returns {readonly ConversationOutput[]} Matching rows.
   */
  private matching(conversations: readonly ConversationOutput[]): readonly ConversationOutput[] {
    const query: string = this.search().trim().toLowerCase();
    if (query.length === 0) return conversations;

    return conversations.filter((conversation: ConversationOutput): boolean =>
      this.labelOf(conversation).toLowerCase().includes(query),
    );
  }
  //#endregion
}
