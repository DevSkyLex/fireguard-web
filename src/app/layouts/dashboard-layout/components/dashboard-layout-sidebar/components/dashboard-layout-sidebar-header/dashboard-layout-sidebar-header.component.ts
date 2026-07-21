import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { canReachOrganizationSettingsTabs } from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { DashboardSidebarService } from '@layouts/dashboard-layout/services';
import { Logo } from '@shared/components/logo';

/**
 * Component DashboardLayoutSidebarHeader
 * @class DashboardLayoutSidebarHeader
 *
 * @description
 * Sidebar header. Inside an organization it shows the workspace name and the
 * settings cog — the discoverable way into settings now that Members, Roles
 * and Settings left the sidebar navigation. Outside an organization it falls
 * back to product branding. The desktop primary sidebar also carries the
 * collapse/expand toggle.
 *
 * Organization identity and grants are consumed through ports, never through
 * concrete feature stores.
 *
 * @version 3.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar-header',
  imports: [TooltipModule, RouterLink, Logo],
  templateUrl: './dashboard-layout-sidebar-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebarHeader {
  //#region Properties
  /**
   * Property sidebarService
   * @readonly
   *
   * @description
   * Layout-scoped sidebar service used to toggle the primary sidebar
   * collapsed (icon-only) state.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {DashboardSidebarService}
   */
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Active organization context port backing the workspace name.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Active member's organization grants, used to decide whether the settings
   * cog leads anywhere.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  /**
   * Property iconOnly
   * @readonly
   *
   * @description
   * When true, renders the compact icon-only header (logo centred, no label).
   *
   * @access public
   * @since 1.0.0
   */
  readonly iconOnly = input<boolean>(false);

  /**
   * Property collapsible
   * @readonly
   *
   * @description
   * When true, exposes the collapse/expand toggle button so the user can
   * switch the primary sidebar between its full and icon-only forms.
   *
   * @access public
   * @since 2.0.0
   */
  readonly collapsible = input<boolean>(false);

  /**
   * Property workspaceName
   * @readonly
   *
   * @description
   * Active organization name, or the product name outside any organization.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly workspaceName: Signal<string> = computed(
    (): string => this.organizationContext.selectedOrganization()?.name ?? 'Fireguard',
  );

  /**
   * Property settingsLink
   * @readonly
   *
   * @description
   * Router link to the active organization's settings, or `null` when no
   * organization is selected or no organization-scoped settings tab is
   * reachable with the member's grants.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<readonly string[] | null>}
   */
  protected readonly settingsLink: Signal<readonly string[] | null> = computed(
    (): readonly string[] | null => {
      const organization = this.organizationContext.selectedOrganization();

      if (!organization) {
        return null;
      }

      const granted: ReadonlySet<string> = new Set(this.memberAccess.permissions());

      return canReachOrganizationSettingsTabs(granted)
        ? ['/organizations', organization.id, 'settings']
        : null;
    },
  );

  /**
   * Property hasOrganization
   * @readonly
   *
   * @description
   * Whether an organization is currently selected — drives the brand fallback.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasOrganization: Signal<boolean> = computed((): boolean =>
    Boolean(this.organizationContext.selectedOrganization()),
  );
  //#endregion
}
