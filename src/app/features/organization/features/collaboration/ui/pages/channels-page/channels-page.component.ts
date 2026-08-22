import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  LOCALE_ID,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHash, lucideMessageSquare, lucidePlus, lucideTriangleAlert } from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import type { ChannelOutput } from '@features/organization/features/collaboration/models';
import {
  ChannelsStore,
  channelsStoreEvents,
  type ChannelsStoreType,
} from '@features/organization/features/collaboration/state';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationPermissionName,
} from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { CollectionSearchBox } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { ChannelCreateDialog, type ChannelCreateDraft } from '../../dialogs/channel-create-dialog';

/**
 * Component ChannelsPage
 * @class ChannelsPage
 *
 * @description
 * The channels workspace: a master list — favorites first, then the
 * organization's channels grouped one level deep under their parent — and
 * the open channel's room beside it.
 *
 * Unlike the direct-messages surface, the list is rendered on this page
 * rather than contributed to the dashboard sidebar: channels have no
 * documented shell-slot requirement the way the always-present conversation
 * list does, so `ChannelsStore` is provided here, component-scoped
 * (`ARCHITECTURE.md` §10.11), and shared with the routed child through the
 * router-outlet's injector — the same relationship `MessageThreadStore` has
 * with `DirectConversationPage`, one level up the tree.
 *
 * Master-detail collapses at the same breakpoint the dashboard shell's own
 * sidebar does. There is no shell sheet to reuse here, so the list pane and
 * the outlet pane toggle `hidden` between themselves below `md`, and the
 * room's own back control is a plain link to this route rather than a
 * sidebar-sheet trigger.
 *
 * The list's search field filters {@link searchQuery} against every loaded
 * channel's name, client-side — the whole list is already in memory, so a
 * narrower match needs no further request.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channels-page',
  imports: [
    NgIcon,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    CollectionSearchBox,
    EmptyState,
    ErrorState,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ChannelCreateDialog,
    ...HlmItemImports,
    ...HlmSeparatorImports,
  ],
  providers: [
    ChannelsStore,
    provideIcons({
      lucideHash,
      lucideMessageSquare,
      lucidePlus,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './channels-page.component.html',
  host: { class: 'flex min-h-0 min-w-0 flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelsPage {
  //#region Properties
  /**
   * Property channels
   * @readonly
   *
   * @description
   * The organization's channels, their favorite flag, their hierarchy and
   * their administration methods.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChannelsStoreType}
   */
  protected readonly channels: ChannelsStoreType = inject<ChannelsStoreType>(ChannelsStore);

  /**
   * Property searchQuery
   * @readonly
   *
   * @description
   * The list filter's current text, matched against a channel's name only —
   * client-side, since every channel is already loaded and a match narrows
   * what is already in memory rather than asking the backend again.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly searchQuery: WritableSignal<string> = signal<string>('');

  /**
   * Property visibleChannels
   * @readonly
   *
   * @description
   * The loaded channels narrowed to {@link searchQuery}, or every channel
   * when the filter is empty. Every other list computed reads from this
   * rather than from `channels.channelEntities()` directly, so the filter
   * applies uniformly to favorites, root channels and nested children.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly ChannelOutput[]>}
   */
  protected readonly visibleChannels: Signal<readonly ChannelOutput[]> = computed(
    (): readonly ChannelOutput[] => {
      const query: string = this.searchQuery().trim().toLowerCase();
      const all: readonly ChannelOutput[] = this.channels.channelEntities();

      return query === ''
        ? all
        : all.filter((channel: ChannelOutput): boolean =>
            channel.name.toLowerCase().includes(query),
          );
    },
  );

  /**
   * Property favoriteChannels
   * @readonly
   *
   * @description
   * Channels the acting member favorited, in list order, drawn above
   * everything else.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ChannelOutput[]>}
   */
  protected readonly favoriteChannels: Signal<readonly ChannelOutput[]> = computed(
    (): readonly ChannelOutput[] =>
      this.visibleChannels().filter((channel: ChannelOutput): boolean => channel.isFavorite),
  );

  /**
   * Property visibleRootChannels
   * @readonly
   *
   * @description
   * Root channels — those without a parent — narrowed to {@link searchQuery}.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly ChannelOutput[]>}
   */
  protected readonly visibleRootChannels: Signal<readonly ChannelOutput[]> = computed(
    (): readonly ChannelOutput[] =>
      this.visibleChannels().filter((channel: ChannelOutput): boolean => !channel.parent),
  );

  /**
   * Property favoritesHeading
   * @readonly
   * @description The favorites section's heading, naming how many favorited channels are shown.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly favoritesHeading: Signal<string> = computed<string>(() => {
    const total: number = this.favoriteChannels().length;

    return $localize`:@@channels.page.favoritesHeadingCount:Favorites (${total}:count:)`;
  });

  /**
   * Property allChannelsHeading
   * @readonly
   * @description The full-tree section's heading, naming how many root channels are shown.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly allChannelsHeading: Signal<string> = computed<string>(() => {
    const total: number = this.visibleRootChannels().length;

    return $localize`:@@channels.page.allHeadingCount:All channels (${total}:count:)`;
  });

  /**
   * Property childrenById
   * @readonly
   *
   * @description
   * Every visible channel's children, keyed by the parent's id, so the tree
   * renders without an O(n) scan per row. Matched on the trailing IRI
   * segment — the id is what is
   * stable across responses, not the IRI.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyMap<string, readonly ChannelOutput[]>>}
   */
  protected readonly childrenById: Signal<ReadonlyMap<string, readonly ChannelOutput[]>> = computed(
    (): ReadonlyMap<string, readonly ChannelOutput[]> => {
      const byParent = new Map<string, ChannelOutput[]>();

      for (const channel of this.visibleChannels()) {
        const parent: string | undefined = channel.parent;
        if (parent === undefined) continue;

        const parentId: string = parent.slice(parent.lastIndexOf('/') + 1);
        const siblings: ChannelOutput[] = byParent.get(parentId) ?? [];
        siblings.push(channel);
        byParent.set(parentId, siblings);
      }

      return byParent;
    },
  );

  /**
   * Property rootChannelOptions
   * @readonly
   *
   * @description
   * Root channels offered as candidate parents in the create dialog. A
   * channel that already has a parent is never offered — the backend caps
   * nesting at one level, so it cannot itself be one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  protected readonly rootChannelOptions: Signal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = computed((): ReadonlyArray<{ readonly value: string; readonly label: string }> =>
    this.channels
      .rootChannels()
      .map((channel: ChannelOutput) => ({ value: channel.id, label: `#${channel.name}` })),
  );

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Whether the first page of channels is still on its way.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed(
    (): boolean => this.channels.isLoading() && this.channels.channelEntities().length === 0,
  );

  /**
   * Property loadErrorMessage
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
  protected readonly loadErrorMessage: Signal<string | null> = computed(
    (): string | null => this.channels.loadError()?.message ?? null,
  );

  /**
   * Property canCreate
   * @readonly
   *
   * @description
   * Whether "New channel" is offered. Creating a channel is administration
   * of the workspace, not merely posting in it, so it gates on
   * `organization.messaging.manage` rather than `.write`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreate: Signal<boolean> = computed((): boolean =>
    this.hasPermission(ORGANIZATION_PERMISSION.MESSAGING_MANAGE),
  );

  /**
   * Property hasOpenChannel
   * @readonly
   *
   * @description
   * Whether a channel is routed, which decides the empty state and, below
   * `md`, which of the two panes is on screen.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly hasOpenChannel: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property createDialogVisible
   * @readonly
   *
   * @description
   * Whether the "New channel" dialog is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly createDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active locale, used to format a row's last-activity hint.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  private readonly router: Router = inject<Router>(Router);

  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  private readonly events: Events = inject<Events>(Events);

  /** The parent chosen in the create dialog, remembered across the create request. */
  private pendingParentId: string | null = null;
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Loads the organization's channels once per organization, and navigates
   * into a channel the create dialog just opened — the store only creates
   * or finds it, and a store cannot navigate itself (`ARCHITECTURE.md`
   * §10.11). Also follows up a create with `setParent` when a parent was
   * chosen, since the create endpoint takes no parent of its own.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (organizationId === null) return;

      untracked((): void => {
        if (this.channels.organizationId() === organizationId) return;

        this.channels.load({ organization: organizationId });
      });
    });

    this.events
      .on(channelsStoreEvents.created)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }: { payload: ChannelOutput }): void => {
        const parentChannelId: string | null = this.pendingParentId;
        this.pendingParentId = null;

        if (parentChannelId !== null) {
          this.channels.setParent({ channelId: payload.id, input: { parentChannelId } });
        }

        void this.router.navigate([payload.id], { relativeTo: this.route });
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method childrenOf
   * @method childrenOf
   *
   * @description
   * The one level of children nested under a root channel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} channelId - The root channel's id.
   *
   * @returns {readonly ChannelOutput[]} Its children, in list order.
   */
  protected childrenOf(channelId: string): readonly ChannelOutput[] {
    return this.childrenById().get(channelId) ?? [];
  }

  /**
   * Method onSearchQueryChanged
   * @method onSearchQueryChanged
   *
   * @description
   * Records a keystroke into the client-side list filter.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} term - The search box's current value.
   *
   * @returns {void}
   */
  protected onSearchQueryChanged(term: string): void {
    this.searchQuery.set(term);
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Reads the channel list again after a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    if (organizationId === null) return;

    this.channels.load({ organization: organizationId });
  }

  /**
   * Method submitCreate
   * @method submitCreate
   *
   * @description
   * Creates the channel. The chosen parent, if any, is applied once the
   * `created` event reports the new channel's id.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ChannelCreateDraft} draft - The validated name and optional parent.
   *
   * @returns {void}
   */
  protected submitCreate(draft: ChannelCreateDraft): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    if (organizationId === null) return;

    this.pendingParentId = draft.parentChannelId;
    this.channels.create({ organization: organizationId, name: draft.name });
  }

  /**
   * Method activityLabel
   * @method activityLabel
   *
   * @description
   * A row's last-activity hint, or `null` when the channel has no message
   * yet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} [lastMessageAt] - ISO-8601 instant of the channel's last message.
   *
   * @returns {string | null} A localized short date, or `null`.
   */
  protected activityLabel(lastMessageAt?: string): string | null {
    if (lastMessageAt === undefined) return null;

    const parsed: number = Date.parse(lastMessageAt);
    if (Number.isNaN(parsed)) return null;

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium' }).format(parsed);
  }

  /**
   * Method unreadLabelFor
   * @method unreadLabelFor
   *
   * @description
   * The accessible name for a row's unread badge, since the badge itself
   * shows only the bare number.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ChannelOutput} channel - The row being drawn.
   *
   * @returns {string} A sentence naming the unread count.
   */
  protected unreadLabelFor(channel: ChannelOutput): string {
    return $localize`:@@channels.page.unread:${channel.unreadCount}:count: unread`;
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
   * @since 1.0.0
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
  //#endregion
}
