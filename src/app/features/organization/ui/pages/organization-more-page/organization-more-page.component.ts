import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideBuilding2,
  lucideCalendarDays,
  lucideChevronRight,
  lucideClipboardList,
  lucideCreditCard,
  lucideHistory,
  lucideWebhook,
  lucideListChecks,
  lucidePackage,
  lucideSettings,
  lucideSettings2,
  lucideShieldCheck,
  lucideUpload,
  lucideUserRound,
  lucideUsers,
  lucideUsersRound,
  lucideWrench,
} from '@ng-icons/lucide';
import { LogoutControl } from '@features/auth';
import {
  buildOrganizationMobileNavigation,
  type OrganizationMobileNavigationModel,
} from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { OrganizationSwitcher } from '@features/organization/ui/components';
import { SLOT_PRESENTATION } from '@shared/layout-slot';
import { ThemeSwitcher } from '@shared/theme-switcher';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component OrganizationMorePage
 * @class OrganizationMorePage
 *
 * @description
 * Full routed directory of secondary organization and account destinations, using
 * native Spartan item groups. Existing owner widgets retain switching, logout and
 * appearance behavior. Sections use two columns from 40rem of available content in either
 * interaction mode. The switcher is deferred to browser rendering to keep its
 * secondary organization list out of SSR. The shell supplies the page's sole h1.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-more-page',
  imports: [
    RouterLink,
    NgIcon,
    HlmItemImports,
    HlmSkeleton,
    OrganizationSwitcher,
    LogoutControl,
    ThemeSwitcher,
  ],
  providers: [
    { provide: SLOT_PRESENTATION, useValue: 'menu' },
    provideIcons({
      lucideBell,
      lucideBuilding2,
      lucideCalendarDays,
      lucideChevronRight,
      lucideClipboardList,
      lucideCreditCard,
      lucideHistory,
      lucideWebhook,
      lucideListChecks,
      lucidePackage,
      lucideSettings,
      lucideSettings2,
      lucideShieldCheck,
      lucideUpload,
      lucideUserRound,
      lucideUsers,
      lucideUsersRound,
      lucideWrench,
    }),
  ],
  templateUrl: './organization-more-page.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMorePage {
  //#region Dependencies
  /**
   * Property organizationContext
   * @readonly
   * @description Current organization context supplied by the parent resolver.
   * @access private
   * @since 1.0.0
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property memberAccess
   * @readonly
   * @description Effective member grants shared with the bottom destinations.
   * @access private
   * @since 1.0.0
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort = inject(
    ORGANIZATION_MEMBER_ACCESS_PORT,
  );
  //#endregion

  //#region Properties
  /**
   * Property navigation
   * @readonly
   * @description Allowed secondary groups resolved without any collection requests.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationMobileNavigationModel>}
   */
  protected readonly navigation: Signal<OrganizationMobileNavigationModel> = computed(() =>
    buildOrganizationMobileNavigation(
      this.organizationContext.selectedOrganizationId(),
      new Set(this.memberAccess.permissions()),
    ),
  );
  //#endregion
}
