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
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import type { ChannelOutput } from '@features/organization/features/collaboration/models';
import { MemberPresenceService } from '@features/organization/features/collaboration/services';
import { ChannelsStore } from '@features/organization/features/collaboration/state';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { NavRow } from '@shared/nav-row';
import type { ChannelNavRow } from './models';

/**
 * Component CollaborationChannelNav
 * @class CollaborationChannelNav
 *
 * @description
 * Favorites and channel sections of the workspace sidebar, contributed to
 * `SECONDARY_NAV_SLOT` below the organization's business navigation.
 *
 * Nesting is derived from the `parent` IRI every row already carries, so the
 * one level of hierarchy the API allows costs no extra request.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-collaboration-channel-nav />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collaboration-channel-nav',
  imports: [IconFieldModule, InputIconModule, InputTextModule, NavRow, SkeletonModule],
  providers: [ChannelsStore],
  templateUrl: './collaboration-channel-nav.component.html',
  host: { class: 'flex flex-col px-2 pb-4' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborationChannelNav {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Channel list for the routed organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof ChannelsStore>}
   */
  protected readonly store: InstanceType<typeof ChannelsStore> = inject(ChannelsStore);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Routed organization, consumed through the port the organization feature
   * publishes rather than by reaching into its state.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property presence
   * @readonly
   *
   * @description
   * The member-presence heartbeat, started here — the always-mounted
   * collaboration sidebar — rather than in the info panel, so the member keeps
   * announcing themselves online for the whole workspace session instead of
   * only while that panel happens to be open.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {MemberPresenceService}
   */
  private readonly presence: MemberPresenceService = inject(MemberPresenceService);

  /**
   * Property favoritesExpanded
   *
   * @description
   * Whether the favorites section is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly favoritesExpanded: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property channelsExpanded
   *
   * @description
   * Whether the channels section is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly channelsExpanded: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property routePrefix
   * @readonly
   *
   * @description
   * Organization-scoped prefix every channel destination is built from.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  private readonly routePrefix: Signal<string | null> = computed((): string | null => {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    return organizationId === null ? null : `/organizations/${organizationId}/channels`;
  });

  /**
   * Property savedLink
   * @readonly
   *
   * @description
   * Destination of the Saved system view, or `null` until the organization is
   * known.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly string[] | null>}
   */
  protected readonly savedLink: Signal<readonly string[] | null> = computed(
    (): readonly string[] | null => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      return organizationId === null ? null : [`/organizations/${organizationId}/saved`];
    },
  );

  /**
   * Property search
   *
   * @description
   * The channel filter text. Filters favorites and channels by name, exactly
   * the two lists the prototype's search touches — the business nav above is
   * left alone.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly search: WritableSignal<string> = signal<string>('');

  /**
   * Property favorites
   * @readonly
   *
   * @description
   * Favorited channels, flat — a favorite is shown for what it is, not for
   * where it sits in the hierarchy.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ChannelNavRow[]>}
   */
  protected readonly favorites: Signal<readonly ChannelNavRow[]> = computed(
    (): readonly ChannelNavRow[] =>
      this.store
        .channelEntities()
        .filter(
          (channel: ChannelOutput): boolean =>
            channel.isFavorite && this.matchesSearch(channel.name),
        )
        .map((channel: ChannelOutput): ChannelNavRow => this.toRow(channel, false)),
  );

  /**
   * Property channelRows
   * @readonly
   *
   * @description
   * Root channels, each followed by its children, flattened into the order
   * they render in.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ChannelNavRow[]>}
   */
  protected readonly channelRows: Signal<readonly ChannelNavRow[]> = computed(
    (): readonly ChannelNavRow[] => {
      const all: readonly ChannelOutput[] = this.store.channelEntities();
      const rows: ChannelNavRow[] = [];

      // Children are grouped by parent id up front so the flattening stays a
      // single pass rather than a scan of the whole list per root.
      const childrenByParent = new Map<string, ChannelOutput[]>();

      for (const channel of all) {
        if (!channel.parent) continue;

        // `parent` is an IRI (`/api/channels/{id}`); take its last segment
        // rather than matching a suffix, which would also match an id that
        // merely ends the same way.
        const parentId: string = channel.parent.slice(channel.parent.lastIndexOf('/') + 1);
        const siblings: ChannelOutput[] = childrenByParent.get(parentId) ?? [];

        siblings.push(channel);
        childrenByParent.set(parentId, siblings);
      }

      for (const root of all) {
        if (root.parent) continue;

        const children: readonly ChannelOutput[] = childrenByParent.get(root.id) ?? [];
        const rootMatches: boolean = this.matchesSearch(root.name);
        const matchingChildren: readonly ChannelOutput[] = children.filter(
          (child: ChannelOutput): boolean => this.matchesSearch(child.name),
        );

        // A root is shown when it matches, or when one of its children does —
        // so a matching child is never orphaned from its parent.
        if (!rootMatches && matchingChildren.length === 0) continue;

        rows.push(this.toRow(root, false));

        const visibleChildren: readonly ChannelOutput[] = rootMatches ? children : matchingChildren;
        for (const child of visibleChildren) {
          rows.push(this.toRow(child, true));
        }
      }

      return rows;
    },
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Reloads the channel list whenever the routed organization changes.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (organizationId === null) return;

      // `isArchived` is deliberately omitted: the filter is presence-based, and
      // the sidebar wants live channels only, which is what the default
      // unfiltered list already gives once archived ones are dropped below.
      this.store.load({ organization: organizationId });

      // Idempotent and root-provided: starting it here keeps the member's
      // online heartbeat alive for the whole workspace, and the info panel's
      // own call becomes a harmless no-op.
      this.presence.start(organizationId);
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Retries the channel list after a failed load.
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void}
   */
  protected reload(): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    if (organizationId === null) return;

    this.store.load({ organization: organizationId });
  }

  /**
   * Method onSearch
   * @method onSearch
   *
   * @description
   * Tracks the search field's value.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {Event} event - Input event from the search field.
   *
   * @return {void}
   */
  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  /**
   * Method clearSearch
   * @method clearSearch
   *
   * @description
   * Empties the search field.
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void}
   */
  protected clearSearch(): void {
    this.search.set('');
  }

  /**
   * Method matchesSearch
   * @method matchesSearch
   *
   * @description
   * Whether a channel name matches the current filter. An empty filter matches
   * everything.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {string} name - Channel name.
   *
   * @return {boolean} Whether the name should be shown.
   */
  private matchesSearch(name: string): boolean {
    const term: string = this.search().trim().toLowerCase();

    return term.length === 0 || name.toLowerCase().includes(term);
  }

  /**
   * Method toggleFavorites
   * @method toggleFavorites
   *
   * @description
   * Opens or closes the favorites section.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected toggleFavorites(): void {
    this.favoritesExpanded.update((expanded: boolean): boolean => !expanded);
  }

  /**
   * Method toggleChannels
   * @method toggleChannels
   *
   * @description
   * Opens or closes the channels section.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected toggleChannels(): void {
    this.channelsExpanded.update((expanded: boolean): boolean => !expanded);
  }

  /**
   * Method toRow
   * @method toRow
   *
   * @description
   * Shapes one channel into a navigation row, dropping archived channels'
   * unread counts so a closed channel never nags.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ChannelOutput} channel - Channel to render.
   * @param {boolean} nested - Whether the row sits under a parent.
   *
   * @return {ChannelNavRow} The row view model.
   */
  private toRow(channel: ChannelOutput, nested: boolean): ChannelNavRow {
    return {
      id: channel.id,
      name: channel.name,
      nested,
      unreadCount: channel.unreadCount > 0 ? channel.unreadCount : null,
      link: [this.routePrefix() ?? '/', channel.id],
    };
  }
  //#endregion
}
