import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChartColumn,
  lucideClipboardList,
  lucideCompass,
  lucideIdCard,
  lucideInbox,
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
 * The sidebar body: every organization destination the active member may
 * actually reach, grouped into sections. Sections whose items are all denied
 * are dropped rather than rendered empty, so the column never advertises a
 * route that would bounce.
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
      lucideChartColumn,
      lucideClipboardList,
      lucideCompass,
      lucideIdCard,
      lucideInbox,
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
   * The routed organization, which prefixes every destination.
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
   * The navigation to render. Empty until an organization is routed, so the
   * column shows nothing rather than links pointing at `/organizations/null`.
   *
   * @access protected
   * @since 1.0.0
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
