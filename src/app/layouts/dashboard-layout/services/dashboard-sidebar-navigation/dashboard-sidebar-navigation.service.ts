import {
  computed,
  inject,
  Injectable,
  type Signal,
} from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { NAVIGATION_SLOT } from '@layouts/dashboard-layout/slots/navigation';
import type { NavigationContribution } from '@layouts/dashboard-layout/slots/navigation';

/**
 * Service DashboardSidebarNavigationService
 * @class DashboardSidebarNavigationService
 *
 * @description
 * Layout-scoped service aggregating sidebar navigation contributions
 * registered via the `NAVIGATION_SLOT` multi-provider
 * token and exposing them as reactive `MenuItem[]` signals.
 *
 * The service is contribution-agnostic: it sorts contributions by their
 * `order` property, resolves the reactive `section` from each, and
 * filters out `null` sections.
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
   * @type {NavigationContribution[]}
   */
  private readonly contributions: NavigationContribution[] = (
    inject(NAVIGATION_SLOT, { optional: true }) ?? []
  ).toSorted(
    (a: NavigationContribution, b: NavigationContribution): number =>
      a.order - b.order,
  );

  /**
   * Property menuItems
   * @readonly
   *
   * @description
    * Sidebar menu items.
    * Aggregates all contributions, resolves their reactive sections and
    * drops `null` values.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  public readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] =>
    this.contributions
      .map((contribution: NavigationContribution): MenuItem | null => contribution.section())
      .filter((item: MenuItem | null): item is MenuItem => item !== null),
  );

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
        (contribution: NavigationContribution): boolean =>
          contribution.includeInPrimary !== false,
      )
      .map((contribution: NavigationContribution): MenuItem | null => contribution.section())
      .filter((item: MenuItem | null): item is MenuItem => item !== null),
  );

  //#endregion

  //#endregion
}

