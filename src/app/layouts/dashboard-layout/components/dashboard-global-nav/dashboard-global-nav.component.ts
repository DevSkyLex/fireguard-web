import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLifeBuoy } from '@ng-icons/lucide';
import {
  ORGANIZATION_CONTEXT_PORT,
  OrganizationPermissionService,
  type OrganizationContextPort,
} from '@features/organization';
import {
  HlmSidebarGroup,
  HlmSidebarGroupContent,
  HlmSidebarMenu,
  HlmSidebarMenuBadge,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
} from '@shared/ui/sidebar';
import { DASHBOARD_GLOBAL_NAV_ITEMS } from './constants';
import type { DashboardGlobalNavRow } from './models';

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
  providers: [provideIcons({ lucideLifeBuoy })],
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
   * The destinations to render, in catalog order, with an organization-scoped
   * route completed by the open organization and a permission-gated row
   * dropped when the member could not reach it.
   *
   * A row that names a permission is withheld until the grants have arrived
   * rather than shown and taken away, which would move the rows under the
   * pointer on every page load.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly DashboardGlobalNavRow[]>}
   */
  protected readonly items: Signal<readonly DashboardGlobalNavRow[]> = computed(
    (): readonly DashboardGlobalNavRow[] => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();
      const rows: DashboardGlobalNavRow[] = [];

      for (const item of DASHBOARD_GLOBAL_NAV_ITEMS) {
        const isGranted: boolean =
          item.permissions === undefined ||
          this.permissionService.hasAnyPermission(item.permissions);

        if (!isGranted) continue;

        if (item.organizationScoped !== true) {
          rows.push({ id: item.id, label: item.label, icon: item.icon, resolvedRoute: item.route });
          continue;
        }

        if (item.route === null || organizationId === null) continue;

        rows.push({
          id: item.id,
          label: item.label,
          icon: item.icon,
          resolvedRoute: `/organizations/${organizationId}/${item.route}`,
        });
      }

      return rows;
    },
  );

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * The organization an organization-scoped row points into, read through the
   * published port rather than the owning store (`ARCHITECTURE.md` §4).
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property permissionService
   * @readonly
   *
   * @description
   * The reader's grants in that organization, which decide whether a gated row
   * is listed at all.
   *
   * The feature's own helper rather than a set built here, because a grant is
   * not always the leaf permission: an owner holds `organization.*`, and a
   * plain membership test would drop every gated row from their column.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

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
