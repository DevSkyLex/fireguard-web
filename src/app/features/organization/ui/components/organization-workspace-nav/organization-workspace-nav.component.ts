import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { ACCOUNT_PERMISSION, UserPermissionService } from '@features/account';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  appendOrganizationAuditNavigationItem,
  buildOrganizationNavigationSection,
  ORGANIZATION_NAVIGATION_GROUPS,
  type OrganizationNavigationGroup,
} from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { NavRow } from '@shared/components';

/**
 * Component OrganizationWorkspaceNav
 * @class OrganizationWorkspaceNav
 *
 * @description
 * The organization's business destinations, rendered as the workspace channel
 * sidebar's first section: a workspace header carrying the organization name
 * and its settings shortcut, then one titled group of navigation rows per
 * {@link ORGANIZATION_NAVIGATION_GROUPS} entry.
 *
 * Reads the same permission-filtered configuration as the dashboard sidebar
 * (`buildOrganizationNavigationSection`), so the two shells can never drift on
 * what a member is allowed to see. Only the presentation differs.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-workspace-nav />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-workspace-nav',
  imports: [NavRow, RouterLink],
  templateUrl: './organization-workspace-nav.component.html',
  host: { class: 'flex flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationWorkspaceNav {
  //#region Properties
  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Routed organization, providing both the header label and the route prefix
   * every destination is built from.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  protected readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * The acting member's granted organization permissions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  /**
   * Property userPermissions
   * @readonly
   *
   * @description
   * Account-level permissions. The audit destination is gated by `audit.read`,
   * which is a user permission rather than an organization-member one.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {UserPermissionService}
   */
  private readonly userPermissions: UserPermissionService =
    inject<UserPermissionService>(UserPermissionService);

  /**
   * Property sections
   * @readonly
   *
   * @description
   * Permission-filtered navigation groups, empty ones dropped.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MenuItem[]>}
   */
  protected readonly destinations: Signal<readonly MenuItem[]> = computed((): readonly MenuItem[] =>
    this.sections().flatMap((section: MenuItem): MenuItem[] => section.items ?? []),
  );

  /**
   * Property sections
   * @readonly
   *
   * @description
   * Permission-filtered navigation groups, still built per group so RBAC and
   * the audit-log append are unchanged, then flattened for display by
   * {@link destinations}. The prototype's business nav is a single flat list.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<readonly MenuItem[]>}
   */
  private readonly sections: Signal<readonly MenuItem[]> = computed((): readonly MenuItem[] => {
    const organization = this.organizationContext.selectedOrganization();

    if (!organization) return [];

    const granted: ReadonlySet<string> = new Set(this.memberAccess.permissions());
    // Destinations stay inside the shell they were opened from. The workspace
    // hosts the same route objects under its own segment, so pointing at the
    // dashboard prefix here would eject the member from the workspace on the
    // first click.
    const prefix: string = `/organizations/${organization.id}/workspace`;
    const canReadAudit: boolean = this.userPermissions.hasPermission(ACCOUNT_PERMISSION.AUDIT_READ);

    return ORGANIZATION_NAVIGATION_GROUPS.map(
      (group: OrganizationNavigationGroup): MenuItem | null => {
        const section: MenuItem | null = buildOrganizationNavigationSection(group, prefix, granted);

        if (group.id !== 'administration' || !canReadAudit) return section;

        return appendOrganizationAuditNavigationItem(section, prefix);
      },
    ).filter((section: MenuItem | null): section is MenuItem => Boolean(section?.items?.length));
  });

  /**
   * Property settingsLink
   * @readonly
   *
   * @description
   * Route to the organization settings, surfaced as the header's cog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[] | null>}
   */
  protected readonly settingsLink: Signal<readonly string[] | null> = computed(
    (): readonly string[] | null => {
      const organization = this.organizationContext.selectedOrganization();

      if (!organization) return null;

      // Same grant the settings route itself requires: a member without it was
      // shown a cog that only led to a permission-denied redirect.
      if (!this.memberAccess.permissions().includes(ORGANIZATION_PERMISSION.SETTINGS_WRITE)) {
        return null;
      }

      return ['/organizations', organization.id, 'workspace', 'settings'];
    },
  );
  //#endregion
}
