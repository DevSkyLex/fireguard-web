import { computed, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { OrganizationStore } from '@core/stores/organization';

/**
 * Service DashboardSidebarNavigationService
 * @class DashboardSidebarNavigationService
 *
 * @description
 * Layout-scoped service managing sidebar navigation items
 * and search filtering logic.
 *
 * Menu items are built dynamically so that every `routerLink`
 * is prefixed with `/organizations/{currentOrgId}`.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class DashboardSidebarNavigationService {
  //#region Properties
  private readonly organizationStore: OrganizationStore =
    inject(OrganizationStore);

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
  private readonly _searchQuery: WritableSignal<string> =
    signal<string>('');

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
  public readonly searchQuery: Signal<string> =
    this._searchQuery.asReadonly();

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * Sidebar menu items filtered by current search query.
   * Route links are prefixed with the active organization path.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  public readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>(
    (): MenuItem[] => {
      const org = this.organizationStore.selectedOrganization();
      const prefix: string = org ? `/organizations/${org.id}` : '';
      const query: string = this.searchQuery();

      const items: readonly MenuItem[] = [
        {
          id: 'home',
          label: 'Home',
          expanded: true,
          items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'pi pi-home', routerLink: prefix || '/' },
            { id: 'bookmarks', label: 'Bookmarks', icon: 'pi pi-bookmark', badge: '3' },
            { id: 'messages', label: 'Messages', icon: 'pi pi-inbox', badge: '1' },
          ],
        },
        {
          id: 'account',
          label: 'Account',
          expanded: true,
          items: [
            {
              id: 'notifications',
              label: 'Notifications',
              icon: 'pi pi-bell',
              routerLink: `${prefix}/account/notifications`,
            },
          ],
        },
      ];

      if (!query) return [...items];
      return this.filterMenuItems(items, query);
    },
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
        const filteredChildren: MenuItem[] = item.items ? this.filterMenuItems(item.items, query) : [];
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
