import { CdkDrag, CdkDropList, type CdkDragMove, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { DOCUMENT, isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
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
import {
  lucideGripVertical,
  lucideCornerUpLeft,
  lucideHash,
  lucideChevronDown,
  lucideSearch,
  lucidePlus,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
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
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import {
  HlmDropdownMenu,
  HlmDropdownMenuItem,
  HlmDropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmInputGroup, HlmInputGroupAddon, HlmInputGroupInput } from '@shared/ui/input-group';
import { HlmItem } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { ChannelCreateDialog, type ChannelCreateDraft } from '../../dialogs/channel-create-dialog';

/**
 * Component ChannelsPanel
 * @class ChannelsPanel
 *
 * @description
 * Channel navigation in the dashboard sidebar extension: favorites, searchable
 * names and a collapsible hierarchy with up to two ancestor levels. This feature-owned widget
 * orchestrates the shared channel store and creation sheet; the shell owns only
 * geometry. Secondary list data loads in the browser, once per organization.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channels-panel',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    CdkDrag,
    CdkDropList,
    HlmDropdownMenu,
    HlmDropdownMenuItem,
    HlmDropdownMenuTrigger,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ChannelCreateDialog,
    HlmItem,
    HlmInputGroup,
    HlmInputGroupAddon,
    HlmInputGroupInput,
    ...HlmCollapsibleImports,
  ],
  providers: [
    provideIcons({
      lucideGripVertical,
      lucideCornerUpLeft,
      lucideHash,
      lucideChevronDown,
      lucideSearch,
      lucidePlus,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './channels-panel.component.html',
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelsPanel {
  //#region Properties
  /**
   * Property document
   * @readonly
   *
   * @description
   * DOM hit testing during browser-only drag gestures.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Document}
   */
  private readonly document: Document = inject(DOCUMENT);

  /**
   * Property draggedChannelId
   * @readonly
   *
   * @description
   * The channel currently being dragged in the tree.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly draggedChannelId: WritableSignal<string | null> = signal(null);

  /**
   * Property dropParentId
   * @readonly
   *
   * @description
   * Candidate destination; undefined means the pointer is outside a drop target.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null | undefined>}
   */
  protected readonly dropParentId: WritableSignal<string | null | undefined> = signal(undefined);

  /**
   * Property moveStatus
   * @readonly
   *
   * @description
   * Live feedback for drag destinations and submitted moves.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly moveStatus: WritableSignal<string> = signal('');

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
      const query: string = this.searchQuery()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/^#/, '');
      const all: readonly ChannelOutput[] = this.channels.channelEntities();

      return query === ''
        ? all
        : all.filter((channel: ChannelOutput): boolean =>
            channel.name
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .includes(query),
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
      this.visibleChannels().filter(
        (channel: ChannelOutput): boolean =>
          !channel.parent ||
          !this.channels.channelEntityMap()[channel.parent.split('/').at(-1) ?? ''],
      ),
  );

  /**
   * Property favoritesHeading
   * @readonly
   *
   * @description
   * Localized heading and count for favorite channels.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly favoritesHeading: Signal<string> = computed<string>(() => {
    const total: number = this.favoriteChannels().length;

    return $localize`:@@channels.page.favoritesHeadingCount:Favorites (${total}:count:)`;
  });

  /**
   * Property allChannelsHeading
   * @readonly
   *
   * @description
   * Localized heading and total channel count, including subchannels.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly allChannelsHeading: Signal<string> = computed<string>(() => {
    const total: number = this.channels.channelEntities().length;

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
        if (!parent) continue;

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
   * Root channels offered as candidate parents in the creation sheet. A
   * channel is created at the top level or under a root; the move menu offers
   * all other destinations that fit the hierarchy depth limit.
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
   * Whether the initial channel list is still on its way.
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
   * Property createDialogVisible
   * @readonly
   *
   * @description
   * Whether the "New channel" sheet is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly createDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property isBrowser
   * @readonly
   *
   * @description
   * Whether this instance may request secondary navigation data.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Selected organization used to scope channel links and requests.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Current member grants controlling channel administration.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Opens created channels through their absolute organization URL.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property events
   * @readonly
   *
   * @description
   * Receives channel creation outcomes from the feature store.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

  /**
   * Property pendingParentId
   *
   * @description
   * Parent chosen in the creation sheet, applied after creation succeeds.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string | null}
   */
  private pendingParentId: string | null = null;

  /**
   * Property channelsRouteBase
   * @readonly
   *
   * @description
   * Absolute channel index route; the extension has the shell injector, not a channel route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly channelsRouteBase: Signal<string> = computed(
    () => `/organizations/${this.organizationContext.selectedOrganizationId() ?? ''}/channels`,
  );

  //#endregion

  //#region Lifecycle
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads secondary navigation in the browser and opens channels after creation.
   * Applies the selected parent after the create response supplies the new id.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (!this.isBrowser || organizationId === null) return;

      untracked((): void => {
        if (
          this.channels.organizationId() === organizationId &&
          (this.channels.isLoaded() || this.channels.isLoading())
        )
          return;

        this.channels.load({ organization: organizationId });
      });
    });

    this.events
      .on(channelsStoreEvents.created)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }: { payload: ChannelOutput }): void => {
        if (
          payload.organization.split('/').at(-1) !==
          this.organizationContext.selectedOrganizationId()
        )
          return;
        const parentChannelId: string | null = this.pendingParentId;
        this.pendingParentId = null;

        if (parentChannelId !== null) {
          this.channels.setParent({ channelId: payload.id, input: { parentChannelId } });
        }

        this.createDialogVisible.set(false);
        void this.router.navigate([this.channelsRouteBase(), payload.id]);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method canMoveTo
   * @method canMoveTo
   *
   * @description
   * Checks current grants, organization, cycles and the supported two ancestor levels.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} channelId - Channel being moved.
   * @param {string | null} parentId - Destination, or null for the root.
   * @returns {boolean}
   */
  protected canMoveTo(channelId: string, parentId: string | null): boolean {
    if (!this.canCreate() || this.channels.isReorganizing() || this.channels.isMutating())
      return false;
    const all = this.channels.channelEntities();
    const source = this.channels.channelEntityMap()[channelId];
    if (
      !source ||
      source.organization.split('/').at(-1) !== this.organizationContext.selectedOrganizationId()
    )
      return false;
    if ((source.parent?.split('/').at(-1) ?? null) === parentId) return false;
    let depth = 0;
    let ancestorId = parentId;
    const visited = new Set<string>([channelId]);
    while (ancestorId !== null) {
      const ancestor = this.channels.channelEntityMap()[ancestorId];
      if (!ancestor || ancestor.organization !== source.organization || visited.has(ancestorId))
        return false;
      visited.add(ancestorId);
      if (++depth > 2) return false;
      ancestorId = ancestor.parent?.split('/').at(-1) ?? null;
    }
    const descendants = [{ id: channelId, depth }];
    const seen = new Set<string>();
    while (descendants.length > 0) {
      const node = descendants.pop();
      if (!node) break;
      if (seen.has(node.id) || node.depth > 2) return false;
      seen.add(node.id);
      for (const child of all.filter((item) => item.parent?.split('/').at(-1) === node.id)) {
        descendants.push({ id: child.id, depth: node.depth + 1 });
      }
    }
    return true;
  }

  /**
   * Method moveLabel
   * @method moveLabel
   *
   * @description
   * Accessible label for the keyboard and touch move menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ChannelOutput} channel - Channel being moved.
   * @returns {string}
   */
  protected moveLabel(channel: ChannelOutput): string {
    return $localize`:@@channels.panel.move:Move #${channel.name}:name:`;
  }

  /**
   * Method moveChannel
   * @method moveChannel
   *
   * @description
   * Saves a validated destination; the store preserves the previous tree on failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} channelId - Channel being moved.
   * @param {string | null} parentId - Destination, or null for the root.
   * @returns {void}
   */
  protected moveChannel(channelId: string, parentId: string | null): void {
    if (!this.canMoveTo(channelId, parentId)) return;
    this.channels.setParent({ channelId, input: { parentChannelId: parentId } });
  }

  /**
   * Method trackDrop
   * @method trackDrop
   *
   * @description
   * Finds the channel row under the drag preview and announces whether it accepts the move.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CdkDragMove<string>} event - Browser pointer coordinates and drag source.
   * @returns {void}
   */
  protected trackDrop(event: CdkDragMove<string>): void {
    const point = event.pointerPosition;
    const element = this.document.elementFromPoint(
      point.x - (this.document.defaultView?.scrollX ?? 0),
      point.y - (this.document.defaultView?.scrollY ?? 0),
    );
    const target = element?.closest('[data-channel-parent]');
    const parentId = target ? target.getAttribute('data-channel-parent') || null : undefined;
    this.dropParentId.set(parentId);
    this.moveStatus.set(
      parentId === undefined
        ? ''
        : this.canMoveTo(event.source.data, parentId)
          ? parentId === null
            ? $localize`:@@channels.panel.dropRoot:Drop here to move to the top level`
            : $localize`:@@channels.panel.dropInside:Drop here to move inside this channel`
          : $localize`:@@channels.panel.dropBlocked:This channel cannot be moved here`,
    );
  }

  /**
   * Method dropChannel
   * @method dropChannel
   *
   * @description
   * Commits a valid pointer destination and clears drag feedback.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CdkDragDrop<unknown, unknown, string>} event - Completed drag in the channel tree.
   * @returns {void}
   */
  protected dropChannel(event: CdkDragDrop<unknown, unknown, string>): void {
    const parentId = this.dropParentId();
    if (event.isPointerOverContainer && parentId !== undefined)
      this.moveChannel(event.item.data, parentId);
    this.clearDrag();
  }

  /**
   * Method clearDrag
   * @method clearDrag
   *
   * @description
   * Clears pointer-only feedback when a drag ends or is cancelled.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected clearDrag(): void {
    this.draggedChannelId.set(null);
    this.dropParentId.set(undefined);
    this.moveStatus.set('');
  }

  /**
   * Method subchannelsLabel
   * @method subchannelsLabel
   *
   * @description
   * Names the separate disclosure control without implying that it opens the room.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ChannelOutput} channel - Parent channel whose children can be toggled.
   * @returns {string} Accessible disclosure label; the primitive reports expanded state.
   */
  protected subchannelsLabel(channel: ChannelOutput): string {
    return $localize`:@@channels.panel.subchannels:Subchannels of #${channel.name}:name:`;
  }

  /**
   * Method childrenOf
   * @method childrenOf
   *
   * @description
   * Direct children of a channel, consumed by the recursive tree template.
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
