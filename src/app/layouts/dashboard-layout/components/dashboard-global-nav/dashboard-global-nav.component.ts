import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLifeBuoy, lucideMessageSquare, lucideSparkles } from '@ng-icons/lucide';
import {
  HlmSidebarGroup,
  HlmSidebarGroupContent,
  HlmSidebarMenu,
  HlmSidebarMenuBadge,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
} from '@shared/ui/sidebar';
import { DASHBOARD_GLOBAL_NAV_ITEMS } from './constants';
import type { DashboardGlobalNavItem } from './models';

/**
 * Component DashboardGlobalNav
 * @class DashboardGlobalNav
 *
 * @description
 * The global half of the sidebar: the destinations that belong to no
 * organization, listed whether or not one is selected. It is what makes the
 * shell stable — the bottom of the column is the same on an organization page
 * and on a global one, and only the organization block above it comes and goes.
 *
 * Pinned to the bottom (`mt-auto` on the host, which is the flex child of the
 * sidebar's scrolling body) because these are utilities rather than the work.
 *
 * Layout-owned rather than feature-owned because nothing here has a business
 * owner: these are the shell's own destinations (`ARCHITECTURE.md` §8.2). A
 * destination that grows a feature moves to that feature's own contribution.
 *
 * A row whose page does not exist yet is rendered unavailable rather than
 * hidden: the product's shape stays visible without anyone landing on a 404.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-global-nav />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-global-nav',
  imports: [
    NgIcon,
    RouterLink,
    RouterLinkActive,
    HlmSidebarGroup,
    HlmSidebarGroupContent,
    HlmSidebarMenu,
    HlmSidebarMenuBadge,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
  ],
  providers: [provideIcons({ lucideLifeBuoy, lucideMessageSquare, lucideSparkles })],
  templateUrl: './dashboard-global-nav.component.html',
  host: { class: 'mt-auto' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardGlobalNav {
  //#region Properties
  /**
   * Property items
   * @readonly
   *
   * @description
   * The destinations to render, in catalog order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly DashboardGlobalNavItem[]}
   */
  protected readonly items: readonly DashboardGlobalNavItem[] = DASHBOARD_GLOBAL_NAV_ITEMS;

  /**
   * Property soonLabel
   * @readonly
   *
   * @description
   * Badge marking a row whose page does not exist yet. Kept to one short word:
   * the badge is absolutely positioned over the end of the row, so a sentence
   * would sit on top of the label it qualifies.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly soonLabel: string = $localize`:@@dashboard.nav.soon:Soon`;
  //#endregion
}
