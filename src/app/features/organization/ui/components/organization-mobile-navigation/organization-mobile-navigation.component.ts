import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideCompass,
  lucideEllipsis,
  lucideLayoutDashboard,
  lucideMessagesSquare,
  lucideNetwork,
  lucideUserRound,
} from '@ng-icons/lucide';
import { filter, map } from 'rxjs';
import {
  activeOrganizationMobileDestination,
  buildOrganizationMobileNavigation,
  type OrganizationMobileNavigationModel,
} from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { HlmButton } from '@shared/ui/button';

/**
 * Component OrganizationMobileNavigation
 * @class OrganizationMobileNavigation
 *
 * @description
 * Organization-owned bottom destinations derived from context, RBAC and the URL.
 * Labels wrap in full, with room for two lines and natural growth for longer translations.
 * The shell owns interaction-mode visibility, safe areas and measurement of the normal-flow band.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-mobile-navigation',
  imports: [RouterLink, NgIcon, HlmButton],
  providers: [
    provideIcons({
      lucideBuilding2,
      lucideCompass,
      lucideEllipsis,
      lucideLayoutDashboard,
      lucideMessagesSquare,
      lucideNetwork,
      lucideUserRound,
    }),
  ],
  templateUrl: './organization-mobile-navigation.component.html',
  host: { class: 'block min-w-0 w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMobileNavigation {
  //#region Dependencies
  /**
   * Property organizationContext
   * @readonly
   * @description Current workspace owned by organization context.
   * @access private
   * @since 1.0.0
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property memberAccess
   * @readonly
   * @description Authoritative member grants, shared with collaboration navigation.
   * @access private
   * @since 1.0.0
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort = inject(
    ORGANIZATION_MEMBER_ACCESS_PORT,
  );

  /**
   * Property router
   * @readonly
   * @description Source of route selection without a copied selected-tab state.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject(Router);
  //#endregion

  //#region Properties
  /**
   * Property currentUrl
   * @readonly
   * @description The settled router URL, seeded for SSR and direct entry.
   * @access private
   * @since 1.0.0
   * @type {Signal<string>}
   */
  private readonly currentUrl: Signal<string> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Property navigation
   * @readonly
   * @description Allowed destinations, including the account fallback without an organization.
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

  /**
   * Property activeDestination
   * @readonly
   * @description Stable destination id matching the actual URL and current permissions.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | null>}
   */
  protected readonly activeDestination: Signal<string | null> = computed(() =>
    activeOrganizationMobileDestination(this.navigation(), this.currentUrl()),
  );
  //#endregion
}
