import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  type Signal,
} from '@angular/core';
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
import type { OrganizationNavSource } from './models';

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
 * On a page that selects no organization — the account, and every other global
 * one — the rows stay in place but go inert. Nothing is being hidden and
 * nothing lies about where it leads: there is simply no organization to lead
 * into until the switcher names one.
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
   * Property isSelected
   * @readonly
   *
   * @description
   * Whether an organization is selected — which is exactly whether the URL
   * names one. Nothing else selects an organization, so a global page such as
   * the account has none, and the destinations below are shown but inert.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isSelected: Signal<boolean> = computed(
    (): boolean => this.organizationContext.selectedOrganizationId() !== null,
  );

  /**
   * Property sections
   * @readonly
   *
   * @description
   * The navigation to render, with routes already prefixed by the selected
   * organization.
   *
   * It keeps its last value while no organization is selected, so stepping into
   * the account leaves the column standing instead of emptying it — the rows go
   * inert (`isSelected`), they do not vanish. There is nothing to keep before a
   * first organization has been opened, and then the block is simply absent.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ReadonlyArray<OrganizationNavigationSection>>}
   */
  protected readonly sections: Signal<ReadonlyArray<OrganizationNavigationSection>> = linkedSignal<
    OrganizationNavSource,
    ReadonlyArray<OrganizationNavigationSection>
  >({
    source: (): OrganizationNavSource => ({
      organizationId: this.organizationContext.selectedOrganizationId(),
      permissions: this.permissionService.permissions(),
    }),
    computation: (
      source: OrganizationNavSource,
      previous:
        | {
            readonly source: OrganizationNavSource;
            readonly value: ReadonlyArray<OrganizationNavigationSection>;
          }
        | undefined,
    ): ReadonlyArray<OrganizationNavigationSection> =>
      source.organizationId === null
        ? (previous?.value ?? [])
        : buildOrganizationNavigation(source.organizationId, new Set<string>(source.permissions)),
  });
  //#endregion
}
