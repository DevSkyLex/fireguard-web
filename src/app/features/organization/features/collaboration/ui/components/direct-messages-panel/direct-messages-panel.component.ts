import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBookmark, lucideSearch } from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import type {
  ConversationOutput,
  DirectConversationView,
} from '@features/organization/features/collaboration/models';
import {
  DirectConversationsStore,
  directConversationsStoreEvents,
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
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmInputGroup, HlmInputGroupAddon, HlmInputGroupInput } from '@shared/ui/input-group';
import { HlmItem } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { DirectMessagePicker } from '../direct-message-picker';

/**
 * Component DirectMessagesPanel
 * @class DirectMessagesPanel
 *
 * @description
 * The direct-conversations list in the dashboard sidebar extension. It owns
 * directory resolution, filtering and the new-conversation picker. The shell
 * mounts it only for messaging routes and remains unaware of the domain.
 * Shared list state survives conversation switches; browser-only priming avoids
 * fetching this secondary navigation during SSR.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-direct-messages-panel />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-direct-messages-panel',
  imports: [
    NgIcon,
    RouterLink,
    RouterLinkActive,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmButton,
    DatePipe,
    HlmBadge,
    HlmInputGroup,
    HlmInputGroupAddon,
    HlmInputGroupInput,
    HlmItem,
    HlmSkeleton,
    DirectMessagePicker,
  ],
  providers: [provideIcons({ lucideBookmark, lucideSearch })],
  templateUrl: './direct-messages-panel.component.html',
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectMessagesPanel {
  //#region Dependencies
  /**
   * Property store
   * @readonly
   *
   * @description
   * Shared direct-conversation state retained across routed threads.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DirectConversationsStoreType}
   */
  private readonly store: DirectConversationsStoreType =
    inject<DirectConversationsStoreType>(DirectConversationsStore);

  /**
   * Property directory
   * @readonly
   *
   * @description
   * Organization-owned member names and avatars.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MemberDirectoryPort}
   */
  private readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Current member permissions for reading and starting conversations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Selected organization used to scope list queries and links.
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
   * Routes to the conversation returned by the member picker.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property events
   * @readonly
   *
   * @description
   * Typed store outcomes observed while the extension is mounted.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject(Events);

  /**
   * Property unknownLabel
   * @readonly
   *
   * @description
   * Neutral fallback when a counterpart cannot be resolved; never exposes an identifier.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
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
   * The contribution gates route activation; this check retains the organization
   * and permission boundary while its content is mounted.
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
   * Property search
   * @readonly
   *
   * @description
   * Local name filter for the loaded conversations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly search: WritableSignal<string> = signal('');

  /**
   * Property filteredConversations
   * @readonly
   *
   * @description
   * Loaded conversations matching the entered counterpart name, ignoring accents and case.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly DirectConversationView[]>}
   */
  protected readonly filteredConversations: Signal<readonly DirectConversationView[]> = computed(
    () => {
      const query = this.normalizeSearch(this.search());
      return this.conversations().filter((conversation) =>
        this.normalizeSearch(conversation.counterpartName).includes(query),
      );
    },
  );

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
   * Primes the list and directory in the browser while the messaging extension
   * is mounted. Routes to the conversation returned by the member picker.
   *
   * @access public
   * @since 2.0.0
   */
  public constructor() {
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    effect((): void => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (!browser || organizationId === null || !this.isVisible()) return;

      untracked((): void => {
        this.store.ensureLoaded(`/api/organizations/${organizationId}`);
        this.directory.ensureLoaded(organizationId);
      });
    });

    this.events
      .on(directConversationsStoreEvents.opened)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }: { payload: ConversationOutput }): void => {
        this.pickerVisible.set(false);
        this.router.navigate([this.messagesRouteBase(), payload.id]);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method normalizeSearch
   * @method normalizeSearch
   *
   * @description
   * Normalizes a display name or query for forgiving local matching.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} value - Name or query entered by the reader.
   * @returns {string} Trimmed, case-insensitive text without combining accents.
   */
  private normalizeSearch(value: string): string {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();
  }

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
