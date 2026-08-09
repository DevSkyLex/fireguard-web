import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarDays,
  lucideChartColumn,
  lucideClipboardList,
  lucideCompass,
  lucideIdCard,
  lucideInbox,
  lucideMessageSquare,
  lucideNetwork,
  lucideSettings,
  lucideUsers,
} from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  buildOrganizationNavigation,
  type OrganizationNavigationSection,
} from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import {
  HlmSidebarGroup,
  HlmSidebarGroupContent,
  HlmSidebarGroupLabel,
  HlmSidebarMenu,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
} from '@shared/ui/sidebar';
/**
 * Component OrganizationNav
 * @class OrganizationNav
 *
 * @description
 * The organization half of the sidebar, and the top of it: every destination
 * the active member may actually reach, grouped into sections. Sections whose
 * items are all denied are dropped rather than rendered empty, so the column
 * never advertises a route that would bounce.
 *
 * The rows keep working on a page that routes no organization — the account,
 * and every other global one — because the context still names the workspace
 * last worked in. Leaving an organization page is not leaving the organization.
 *
 * Rows are built on `hlmSidebarMenuButton`, which carries the classes that keep
 * them from clipping once the column narrows to the icon rail; the tooltip is
 * what names a destination there. The active match is exact for the landing
 * entry alone, since every other route is a prefix of it.
 *
 * Feature-owned rather than layout-owned because it reads organization context
 * and member permissions; the shell only lends it a slot (`ARCHITECTURE.md`
 * §2.7). It is contributed through `withOrganizationNav()`.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-nav />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-nav',
  imports: [
    NgIcon,
    RouterLink,
    RouterLinkActive,
    HlmSidebarGroup,
    HlmSidebarGroupContent,
    HlmSidebarGroupLabel,
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
  ],
  providers: [
    provideIcons({
      lucideCalendarDays,
      lucideChartColumn,
      lucideClipboardList,
      lucideCompass,
      lucideIdCard,
      lucideInbox,
      lucideMessageSquare,
      lucideNetwork,
      lucideSettings,
      lucideUsers,
    }),
  ],
  templateUrl: './organization-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationNav {
  //#region Properties
  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * The selected organization, which prefixes every destination.
   *
   * @access private
   * @since 1.0.0
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
   * The active member's effective grants, which decide what is listed.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property sections
   * @readonly
   *
   * @description
   * The navigation to render, with routes already prefixed by the organization
   * currently open — which the context keeps naming on the account and the
   * other global pages, so the column stays usable there rather than going
   * inert. It is empty only before a first organization has ever been opened.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<ReadonlyArray<OrganizationNavigationSection>>}
   */
  protected readonly sections: Signal<ReadonlyArray<OrganizationNavigationSection>> = computed(
    (): ReadonlyArray<OrganizationNavigationSection> => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (organizationId === null) return [];

      return buildOrganizationNavigation(
        organizationId,
        new Set<string>(this.permissionService.permissions()),
      );
    },
  );
  //#endregion
}
