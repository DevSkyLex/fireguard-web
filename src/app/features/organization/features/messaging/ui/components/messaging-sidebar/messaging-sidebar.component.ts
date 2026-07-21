import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
  NewChannelDialog,
  NewDirectConversationDialog,
} from '@features/organization/features/messaging/ui/dialogs';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import {
  OrganizationMemberAccessStore,
  OrganizationMemberDirectoryStore,
  type MemberIdentity,
  type OrganizationMemberDirectoryStoreType,
} from '@features/organization/state';
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
  imports: [RouterLink, NgTemplateOutlet, NewChannelDialog, NewDirectConversationDialog],
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
   * Property directOpen
   * @readonly
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly directOpen: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property directConversations
   * @readonly
   *
   * @description
   * Direct conversations matching the search. The prototype hides them behind
   * a nav destination; here they are a section, because this sidebar is the
   * workspace's only conversation list.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly ConversationOutput[]>}
   */
  protected readonly directConversations: Signal<readonly ConversationOutput[]> = computed(
    (): readonly ConversationOutput[] => this.matching(this.inventory.directConversations()),
  );

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
   * Property channelDialogOpen
   * @readonly
   *
   * @description
   * Whether the "new channel" dialog shows.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly channelDialogOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property directDialogOpen
   * @readonly
   *
   * @description
   * Whether the "new message" member picker shows.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly directDialogOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property collapsedChannels
   * @readonly
   *
   * @description
   * Parent channels whose children are folded away. Collapsed rather than
   * expanded by default is the wrong way round for a workspace you live in, so
   * the set starts empty and only what the member folds is remembered.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  protected readonly collapsedChannels: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set());

  /**
   * Property directory
   * @readonly
   *
   * @description
   * The workspace's members, loaded lazily when the picker opens — the sidebar
   * itself never needs them.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationMemberDirectoryStoreType}
   */
  protected readonly directory: OrganizationMemberDirectoryStoreType = inject(
    OrganizationMemberDirectoryStore,
  );

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Source of the acting member's id, so the picker can leave them out.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {InstanceType<typeof OrganizationMemberAccessStore>}
   */
  private readonly memberAccess: InstanceType<typeof OrganizationMemberAccessStore> = inject(
    OrganizationMemberAccessStore,
  );

  /**
   * Property addressableMembers
   * @readonly
   *
   * @description
   * Everyone but the acting member: a direct conversation with oneself is not
   * a thing the endpoint accepts.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly MemberIdentity[]>}
   */
  protected readonly addressableMembers: Signal<readonly MemberIdentity[]> = computed(
    (): readonly MemberIdentity[] => {
      const self: string | null = this.memberAccess.currentMemberId();

      return Array.from(this.directory.identities().values()).filter(
        (member: MemberIdentity): boolean => member.id !== self,
      );
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
   * A conversation's display label — channel name, subject label, or, for a
   * direct conversation, the counterpart member's name resolved against the
   * directory (the API sends only their IRI, never a display name).
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {ConversationOutput} conversation - Conversation to label.
   *
   * @returns {string} Display label.
   */
  protected labelOf(conversation: ConversationOutput): string {
    // `?? null` on the tail: API Platform omits null fields entirely, so a
    // direct conversation arrives with `name`/`subjectLabel` UNDEFINED, which a
    // bare `!== null` check would let through as the label.
    const named: string | null = conversation.name ?? conversation.subjectLabel ?? null;
    if (named !== null) return named;

    const counterpart: string | null | undefined = conversation.counterpartMember;
    if (typeof counterpart !== 'string' || '' === counterpart) return '';

    const memberId: string = counterpart.slice(counterpart.lastIndexOf('/') + 1);

    return this.directory.identities().get(memberId)?.displayName ?? '';
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

  /**
   * Constructor
   *
   * @description
   * Follows a freshly created or opened conversation: closes the dialog,
   * clears the store's one-shot result so the next success is a real
   * transition, and deep links into the thread.
   *
   * @access public
   * @since 2.0.0
   */
  public constructor() {
    effect((): void => {
      const conversationId: string | null = this.inventory.openedConversationId();
      const link: readonly string[] | null = this.messagesLink();

      if (conversationId === null || link === null) return;

      this.channelDialogOpen.set(false);
      this.directDialogOpen.set(false);
      this.inventory.clearOpenedConversation();
      void this.router.navigate([...link], { queryParams: { conversation: conversationId } });
    });
  }

  /**
   * Method createChannel
   *
   * @description
   * Opens a channel in the active organization. The dialog stays up until the
   * call succeeds, so a rejected name is not retyped from scratch.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} name - The confirmed channel name.
   *
   * @returns {void}
   */
  /**
   * Method toggleChannel
   *
   * @description
   * Folds or unfolds one parent channel's children.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} channelId - The parent whose children to fold.
   *
   * @returns {void}
   */
  protected toggleChannel(channelId: string): void {
    this.collapsedChannels.update((collapsed: ReadonlySet<string>): ReadonlySet<string> => {
      const next = new Set(collapsed);
      if (!next.delete(channelId)) next.add(channelId);

      return next;
    });
  }

  protected createChannel(name: string): void {
    const organizationId: string | undefined = this.organizationContext.selectedOrganization()?.id;
    if (organizationId === undefined) return;

    this.inventory.createChannel({ organizationId, name });
  }

  /**
   * Method openDirectDialog
   *
   * @description
   * Opens the member picker, fetching the directory on the way in. Loading it
   * here rather than on mount keeps the sidebar's cost to the conversation
   * list for the many members who never start a new thread.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected openDirectDialog(): void {
    this.directory.load(this.organizationContext.selectedOrganization()?.id ?? null);
    this.directDialogOpen.set(true);
  }

  /**
   * Method openDirectConversation
   *
   * @description
   * Writes to a member. The endpoint is get-or-create, so this reopens an
   * existing thread just as well as it starts one.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} memberId - The addressed member.
   *
   * @returns {void}
   */
  protected openDirectConversation(memberId: string): void {
    const organizationId: string | undefined = this.organizationContext.selectedOrganization()?.id;
    if (organizationId === undefined) return;

    this.inventory.openDirectConversation({ organizationId, memberId });
  }
  //#endregion
}
