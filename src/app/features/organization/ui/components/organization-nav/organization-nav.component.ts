import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarDays,
  lucideClipboardList,
  lucideCompass,
  lucideLayoutDashboard,
  lucideListChecks,
  lucideNetwork,
  lucideShieldCheck,
  lucideUpload,
  lucideWrench,
} from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  buildOrganizationNavigation,
  type OrganizationNavigationCounterKey,
  type OrganizationNavigationSection,
} from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationNavigationCountersStore } from '@features/organization/state';
import { HlmBadge } from '@shared/ui/badge';
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
 * A link whose config declares a `counterKey` (Interventions' `submittedInterventions`)
 * carries a numeric badge from `OrganizationNavigationCountersStore`, hidden
 * entirely at zero and never colour-only — the count and its `aria-label`
 * both name what it counts.
 *
 * @version 1.1.0
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
    HlmBadge,
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
      lucideClipboardList,
      lucideCompass,
      lucideLayoutDashboard,
      lucideListChecks,
      lucideNetwork,
      lucideShieldCheck,
      lucideUpload,
      lucideWrench,
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
   * Property navigationCountersStore
   * @readonly
   *
   * @description
   * Sidebar badge counters for the active organization, reloaded on
   * organization switch by the root store itself.
   *
   * @access private
   * @since 3.1.0
   *
   * @type {OrganizationNavigationCountersStore}
   */
  private readonly navigationCountersStore: OrganizationNavigationCountersStore =
    inject<OrganizationNavigationCountersStore>(OrganizationNavigationCountersStore);

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

  //#region Methods
  /**
   * Method counterOf
   * @method counterOf
   *
   * @description
   * Reads the live value a link's `counterKey` names, or `0` for a link
   * that declares none.
   *
   * @access protected
   * @since 3.1.0
   *
   * @param {OrganizationNavigationCounterKey} [counterKey] - The counters field to read.
   *
   * @returns {number} The current counter value.
   */
  protected counterOf(counterKey?: OrganizationNavigationCounterKey): number {
    if (counterKey === undefined) return 0;

    return this.navigationCountersStore[counterKey]();
  }

  /**
   * Method counterLabelOf
   * @method counterLabelOf
   *
   * @description
   * Builds the badge's `aria-label`, naming what the count means rather than
   * leaving a bare number for assistive technology.
   *
   * @access protected
   * @since 3.1.0
   *
   * @param {number} count - The counter value, always greater than zero when called.
   *
   * @returns {string} The localized, pluralized label.
   */
  protected counterLabelOf(count: number): string {
    return count === 1
      ? $localize`:@@org.nav.interventions.awaitingReviewOne:1 intervention awaiting review`
      : $localize`:@@org.nav.interventions.awaitingReviewMany:${count}:count: interventions awaiting review`;
  }
  //#endregion
}
