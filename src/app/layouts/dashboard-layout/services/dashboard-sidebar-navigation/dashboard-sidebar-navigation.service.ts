import {
  computed,
  inject,
  Injectable,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { SIDEBAR_NAVIGATION_SLOT } from '@layouts/dashboard-layout/slots/sidebar-navigation';
import type { SidebarNavigationContribution } from '@layouts/dashboard-layout/slots/sidebar-navigation';

/**
 * Service DashboardSidebarNavigationService
 * @class DashboardSidebarNavigationService
 *
 * @description
 * Layout-scoped service aggregating sidebar navigation contributions
 * registered via the `SIDEBAR_NAVIGATION_SLOT` multi-provider
 * token and exposing them as reactive `MenuItem[]` signals.
 *
 * The service is contribution-agnostic: it sorts contributions by their
 * `order` property, resolves the reactive `section` from each, filters
 * out `null` sections, and applies the current search query.
 *
 * @version 3.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class DashboardSidebarNavigationService {
  //#region Properties
  /**
   * Property contributions
   * @readonly
   *
   * @description
   * All navigation contributions injected via the multi-provider token,
   * sorted by ascending `order`.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {SidebarNavigationContribution[]}
   */
  private readonly contributions: SidebarNavigationContribution[] = (
    inject(SIDEBAR_NAVIGATION_SLOT, { optional: true }) ?? []
  ).toSorted(
    (a: SidebarNavigationContribution, b: SidebarNavigationContribution): number =>
      a.order - b.order,
  );

  /**
   * Property _searchQuery
   * @readonly
   *
   * @description
   * Internal writable signal storing the current
   * sidebar navigation search query.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  private readonly _searchQuery: WritableSignal<string> = signal<string>('');

  /**
   * Property searchQuery
   * @readonly
   *
   * @description
   * Read-only search query signal consumed by the sidebar UI.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  public readonly searchQuery: Signal<string> = this._searchQuery.asReadonly();

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * Sidebar menu items filtered by current search query.
   * Aggregates all contributions, resolves their reactive sections and
   * drops `null` values, then applies the optional search filter.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  public readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const query: string = this.searchQuery().trim();

    const items: MenuItem[] = this.contributions
      .map((contribution: SidebarNavigationContribution): MenuItem | null => contribution.section())
      .filter((item: MenuItem | null): item is MenuItem => item !== null);

    if (!query) {
      return items;
    }

    return this.filterMenuItems(items, query);
  });

  /**
   * Property primaryItems
   * @readonly
   *
   * @description
   * Navigation items for the primary (always-visible collapsed) sidebar.
   * Aggregates all contributions whose section is currently non-null.
   * Never filtered by search query.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  public readonly primaryItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] =>
    this.contributions
      .filter(
        (contribution: SidebarNavigationContribution): boolean =>
          contribution.includeInPrimary !== false,
      )
      .map((contribution: SidebarNavigationContribution): MenuItem | null => contribution.section())
      .filter((item: MenuItem | null): item is MenuItem => item !== null),
  );

  //#endregion

  //#region Methods

  /**
   * Method setSearchQuery
   * @method setSearchQuery
   *
   * @description
   * Updates the sidebar search query.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} query - Search input value.
   *
   * @returns {void}
   */
  public setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  /**
   * Method clearSearchQuery
   * @method clearSearchQuery
   *
   * @description
   * Clears the sidebar search query.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public clearSearchQuery(): void {
    this._searchQuery.set('');
  }

  /**
   * Method filterMenuItems
   * @method filterMenuItems
   *
   * @description
   * Recursively filters menu items by label while keeping
   * parent nodes when a child matches.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {readonly MenuItem[]} items - Source menu items.
   * @param {string} query - Search query.
   *
   * @returns {MenuItem[]} Filtered menu items.
   */
  private filterMenuItems(items: readonly MenuItem[], query: string): MenuItem[] {
    return items
      .map((item: MenuItem): MenuItem | null => {
        const filteredChildren: MenuItem[] = item.items
          ? this.filterMenuItems(item.items, query)
          : [];
        const itemMatches: boolean = (item.label ?? '').includes(query);

        if (!itemMatches && filteredChildren.length === 0) return null;

        return {
          ...item,
          expanded: filteredChildren.length > 0 ? true : item.expanded,
          items: filteredChildren.length > 0 ? filteredChildren : undefined,
        };
      })
      .filter((item: MenuItem | null): item is MenuItem => item !== null);
  }
  //#endregion
}
