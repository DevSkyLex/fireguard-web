import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { type IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { RippleModule } from 'primeng/ripple';
import { OrganizationOutput } from '@app/features/organization/models';
import { ACCOUNT_PERMISSION, UserPermissionService } from '@features/account';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization';
import {
  buildOrganizationNavigationSections,
  ORGANIZATION_NAVIGATION_GROUPS,
  type OrganizationNavigationGroup,
} from '@features/organization/navigation';
import { getOrganizationInitials } from '@features/organization/utils';
import { OrganizationQuotaMeters } from '../organization-quota-meters/organization-quota-meters.component';

/**
 * Component OrganizationSecondarySidebar
 * @class OrganizationSecondarySidebar
 *
 * @description
 * Organization-owned navigation panel rendered in the dashboard secondary
 * sidebar slot when an organization is active. Displays organization-scoped
 * navigation items grouped into sections (Overview, Field work, Assets,
 * Compliance, Administration) filtered by the current member's permissions.
 *
 * This component is feature-owned, manages its own state, and is registered
 * as a slot contribution by `provideOrganization()`. Its design is
 * intentionally independent from the primary sidebar.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-nav-panel',
  imports: [RippleModule, RouterLink, RouterLinkActive, OrganizationQuotaMeters],
  templateUrl: './organization-nav-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationNavPanel {
  //#region Properties
  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Organization context port providing the currently selected organization.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property organizationMemberAccess
   * @readonly
   *
   * @description
   * Organization member access port providing the granted permissions
   * for the current member.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly organizationMemberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  /**
   * Property userPermissionService
   * @readonly
   *
   * @description
   * Account-owned global permission helper. The audit log destination is
   * gated by the global `audit.read` permission rather than organization
   * member RBAC, so it cannot be expressed as an `OrganizationNavigationItem`
   * (whose `permissions` are typed to `OrganizationPermissionName`). This
   * service resolves visibility for that one item instead.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {UserPermissionService}
   */
  private readonly userPermissionService: UserPermissionService =
    inject<UserPermissionService>(UserPermissionService);

  /**
   * Property selectedOrganization
   * @readonly
   *
   * @description
   * Currently active organization exposed to the template for the panel header.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<OrganizationOutput | null>}
   */
  protected readonly selectedOrganization: Signal<OrganizationOutput | null> = computed(
    (): OrganizationOutput | null => this.organizationContext.selectedOrganization(),
  );

  /**
   * Property navigationItems
   * @readonly
   *
   * @description
   * Organization-scoped navigation items filtered by the current member's
   * permissions. Returns an empty array when no organization is active
   * or no items pass the permission filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly navigationItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const organization: OrganizationOutput | null = this.organizationContext.selectedOrganization();

    if (organization === null) return [];

    const grantedPermissions: ReadonlySet<string> = new Set(
      this.organizationMemberAccess.permissions(),
    );
    const prefix: string = `/organizations/${organization.id}`;
    const sections: MenuItem[] = buildOrganizationNavigationSections(prefix, grantedPermissions);

    if (!this.userPermissionService.hasPermission(ACCOUNT_PERMISSION.AUDIT_READ)) {
      return sections;
    }

    return this.withAuditNavigationItem(sections, prefix);
  });

  /**
   * Property exactMatchOptions
   * @readonly
   *
   * @description
   * Router active options for exact route matching (used for root `/`).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {IsActiveMatchOptions}
   */
  private readonly exactMatchOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  /**
   * Property subsetMatchOptions
   * @readonly
   *
   * @description
   * Router active options for non-root route matching.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {IsActiveMatchOptions}
   */
  private readonly subsetMatchOptions: IsActiveMatchOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
  //#endregion

  //#region Methods
  /**
   * Method withAuditNavigationItem
   * @method withAuditNavigationItem
   *
   * @description
   * Appends the audit log destination to the "Administration" section,
   * creating that section when no organization-permission-gated item is
   * currently visible in it.
   *
   * @access private
   * @since 1.3.0
   *
   * @param {MenuItem[]} sections - Sections built from organization-member permissions.
   * @param {string} prefix - Active organization route prefix.
   *
   * @returns {MenuItem[]} Sections including the audit log destination.
   */
  private withAuditNavigationItem(sections: MenuItem[], prefix: string): MenuItem[] {
    const auditItem: MenuItem = {
      id: 'audit',
      label: $localize`:@@org.nav.audit:Audit log`,
      icon: 'pi pi-history',
      routerLink: `${prefix}/audit`,
    };

    const administrationIndex: number = sections.findIndex(
      (section: MenuItem): boolean => section.id === 'administration',
    );

    if (administrationIndex === -1) {
      const group: OrganizationNavigationGroup | undefined = ORGANIZATION_NAVIGATION_GROUPS.find(
        (candidate: OrganizationNavigationGroup): boolean => candidate.id === 'administration',
      );

      return [
        ...sections,
        { id: 'administration', label: group?.label ?? '', expanded: true, items: [auditItem] },
      ];
    }

    const updatedSections: MenuItem[] = [...sections];
    const administrationSection: MenuItem = updatedSections[administrationIndex];
    updatedSections[administrationIndex] = {
      ...administrationSection,
      items: [...(administrationSection.items ?? []), auditItem],
    };

    return updatedSections;
  }

  /**
   * Method orgInitials
   * @method orgInitials
   *
   * @description
   * Derives the monogram initials shown in the panel header avatar from
   * the active organization name.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} name - The organization name to derive the initials from.
   *
   * @returns {string} The derived initials, in uppercase.
   */
  protected orgInitials(name: string): string {
    return getOrganizationInitials(name);
  }

  /**
   * Method getRouterLinkActiveOptions
   * @method getRouterLinkActiveOptions
   *
   * @description
   * Returns active route matching options based on the item's route.
   * Root route uses exact matching to avoid being active on all URLs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MenuItem['routerLink']} routerLink - Navigation item route.
   *
   * @returns {IsActiveMatchOptions}
   */
  protected getRouterLinkActiveOptions(routerLink: MenuItem['routerLink']): IsActiveMatchOptions {
    if (typeof routerLink === 'string' && routerLink === '/') {
      return this.exactMatchOptions;
    }

    return this.subsetMatchOptions;
  }

  //#endregion
}
