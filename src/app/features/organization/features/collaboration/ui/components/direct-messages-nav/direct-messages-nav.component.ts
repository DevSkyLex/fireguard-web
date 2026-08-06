import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePenLine } from '@ng-icons/lucide';
import type {
  ConversationOutput,
  DirectConversationView,
} from '@features/organization/features/collaboration/models';
import {
  DirectConversationsStore,
  type DirectConversationsStoreType,
} from '@features/organization/features/collaboration/state';
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
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import {
  HlmSidebarGroup,
  HlmSidebarGroupAction,
  HlmSidebarGroupContent,
  HlmSidebarGroupLabel,
  HlmSidebarMenu,
  HlmSidebarMenuBadge,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
  HlmSidebarMenuSkeleton,
} from '@shared/ui/sidebar';
import { NewDirectMessageDialog } from '../../dialogs/new-direct-message-dialog';

/**
 * Component DirectMessagesNav
 * @class DirectMessagesNav
 *
 * @description
 * The direct-conversations list, contributed to the dashboard sidebar rather
 * than rendered inside the messages page. It renders only while the reader is
 * somewhere under the messages surface — elsewhere it is empty — so that the
 * sidebar does not permanently spend space on a feature most pages never use.
 *
 * Feature-owned rather than shell-owned because it reads conversation state,
 * organization context and member permissions; the shell only lends it a slot
 * (`ARCHITECTURE.md` §2.7). It is the sanctioned exception to "only a page
 * injects a store" (§2.7, precedent: the account notification bell) — it is on
 * screen for the whole surface, which no single page is.
 *
 * It owns priming the conversation list and the member directory: doing so
 * here rather than on the page means a conversation switch does not repeat the
 * load, and the widget is what actually stays mounted for the surface's whole
 * lifetime. The load itself is gated on the surface being open, so visiting an
 * unrelated organization page never fetches conversations nobody is about to
 * look at.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-direct-messages-nav />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-direct-messages-nav',
  imports: [
    NgIcon,
    RouterLink,
    RouterLinkActive,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmSidebarGroup,
    HlmSidebarGroupAction,
    HlmSidebarGroupContent,
    HlmSidebarGroupLabel,
    HlmSidebarMenu,
    HlmSidebarMenuBadge,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSidebarMenuSkeleton,
    NewDirectMessageDialog,
  ],
  providers: [provideIcons({ lucidePenLine })],
  templateUrl: './direct-messages-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectMessagesNav {
  //#region Dependencies
  private readonly store: DirectConversationsStoreType =
    inject<DirectConversationsStoreType>(DirectConversationsStore);

  private readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /** Stands in wherever a member cannot be named. Never a raw id. */
  private readonly unknownLabel: string = $localize`:@@messages.unknownMember:Unknown member`;
  //#endregion

  //#region Properties
  /**
   * Property isVisible
   * @readonly
   *
   * @description
   * Whether the block belongs in the column at all: there is an organization
   * to read conversations from, and the reader is allowed to read them.
   *
   * Not gated on the messages route. Conversations follow the reader rather
   * than the page, so the list stays in the sidebar the way a mail client
   * keeps its mailboxes — which is also why the list is fetched on the first
   * signed-in page rather than on arrival at the surface.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isVisible: Signal<boolean> = computed(
    (): boolean =>
      this.organizationContext.selectedOrganizationId() !== null &&
      this.hasPermission(ORGANIZATION_PERMISSION.MESSAGING_READ),
  );

  /**
   * Property messagesRouteBase
   * @readonly
   *
   * @description
   * Absolute path of the messages surface for the selected organization, which
   * a row's link is built from.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly messagesRouteBase: Signal<string> = computed(
    (): string =>
      `/organizations/${this.organizationContext.selectedOrganizationId() ?? ''}/messages`,
  );

  /**
   * Property conversations
   * @readonly
   *
   * @description
   * The list rows, with each counterpart resolved to a name and a face.
   *
   * A row whose counterpart cannot be resolved keeps a neutral label rather
   * than falling back to the member id: the directory needs a permission
   * messaging does not imply, and a UUID is not a name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly DirectConversationView[]>}
   */
  protected readonly conversations: Signal<readonly DirectConversationView[]> = computed(
    (): readonly DirectConversationView[] =>
      this.store.rows().map((row: ConversationOutput): DirectConversationView => {
        const entry: MemberDirectoryEntry | undefined =
          row.counterpartMember !== undefined && this.directory.isAvailable()
            ? this.directory.byId().get(this.memberIdOf(row.counterpartMember))
            : undefined;

        return {
          id: row.id,
          counterpartName: entry?.displayName ?? this.unknownLabel,
          counterpartAvatarUrl: entry?.avatarUrl,
          isResolved: entry !== undefined,
          lastMessageAt: row.lastMessageAt,
          unreadCount: row.unreadCount,
        };
      }),
  );

  /**
   * Property skeletonRows
   * @readonly
   *
   * @description
   * Placeholder rows drawn while the list loads. A fixed count, because the
   * real one is not known until the answer arrives.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly number[]}
   */
  protected readonly skeletonRows: readonly number[] = [0, 1, 2];

  /**
   * Property pickerVisible
   * @readonly
   *
   * @description
   * Whether the member picker is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly pickerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property candidates
   * @readonly
   *
   * @description
   * Who a conversation can be opened with: the organization's active members,
   * without the reader — the API refuses a conversation with oneself.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly candidates: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => {
      const ownId: string | undefined = this.memberAccess.profile()?.id;

      return [...this.directory.byId().values()]
        .filter(
          (member: MemberDirectoryEntry): boolean => member.isActive && member.memberId !== ownId,
        )
        .toSorted((first: MemberDirectoryEntry, second: MemberDirectoryEntry): number =>
          first.displayName.localeCompare(second.displayName),
        );
    },
  );

  /**
   * Property canStartConversation
   * @readonly
   *
   * @description
   * Whether the "New message" control is offered. Opening a conversation is a
   * write, and picking someone needs a readable directory — without either the
   * control would only lead to a refusal.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canStartConversation: Signal<boolean> = computed(
    (): boolean =>
      this.directory.isAvailable() && this.hasPermission(ORGANIZATION_PERMISSION.MESSAGING_WRITE),
  );

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Whether the conversation list is still being read.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed((): boolean => this.store.isLoading());

  /**
   * Property isOpening
   * @readonly
   *
   * @description
   * Whether a conversation is being opened from the picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isOpening: Signal<boolean> = computed((): boolean => this.store.isOpening());

  /**
   * Property listErrorMessage
   * @readonly
   *
   * @description
   * Why the list could not be read, or `null` when it could.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly listErrorMessage: Signal<string | null> = computed(
    (): string | null => this.store.loadError()?.message ?? null,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Primes the conversation list and the member directory for whichever
   * organization is open, so the column is populated before the reader asks
   * for it and a deep link into a conversation resolves its counterpart
   * without the page having to ask a second time.
   *
   * @access public
   * @since 2.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (organizationId === null || !this.isVisible()) return;

      untracked((): void => {
        this.store.ensureLoaded(`/api/organizations/${organizationId}`);
        this.directory.ensureLoaded(organizationId);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method openWith
   * @method openWith
   *
   * @description
   * Opens the conversation with a member, creating it on first use.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - Bare member id of the counterpart.
   *
   * @returns {void}
   */
  protected openWith(memberId: string): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    if (organizationId === null) return;

    this.store.open({ organization: `/api/organizations/${organizationId}`, memberId });
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Reads the conversation list again after a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    if (organizationId === null) return;

    this.store.load({ organization: `/api/organizations/${organizationId}` });
  }

  /**
   * Method unreadLabelFor
   * @method unreadLabelFor
   *
   * @description
   * The accessible name for a row's unread badge, since the badge itself shows
   * only the bare number.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {DirectConversationView} conversation - The row being drawn.
   *
   * @returns {string} A sentence naming the unread count.
   */
  protected unreadLabelFor(conversation: DirectConversationView): string {
    return $localize`:@@messages.nav.unread:${conversation.unreadCount}:count: unread`;
  }

  /**
   * Method initialsOf
   * @method initialsOf
   *
   * @description
   * Fallback shown while a counterpart's avatar is missing or still loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} name - The counterpart's resolved name.
   *
   * @returns {string} Up to two uppercase initials.
   */
  protected initialsOf(name: string): string {
    return name
      .split(/\s+/)
      .filter((part: string): boolean => part.length > 0)
      .slice(0, 2)
      .map((part: string): string => part[0]?.toUpperCase() ?? '')
      .join('');
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
   * @since 2.0.0
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
   * @param {string} memberIri - The IRI a conversation carries.
   *
   * @returns {string} The trailing id segment.
   */
  private memberIdOf(memberIri: string): string {
    return memberIri.slice(memberIri.lastIndexOf('/') + 1);
  }
  //#endregion
}
