import { ACCOUNT_PERMISSION, type AccountPermissionName } from '@features/account';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationPermissionName,
} from '@features/organization/models';
import {
  matchesOrganizationPermission,
  type OrganizationNavigationMatch,
} from './organization-navigation.config';

/**
 * Interface OrganizationSettingsTab
 * @interface OrganizationSettingsTab
 *
 * @description
 * One tab of the organization settings area. Each tab is a real child route
 * with its own guard, not a `?tab=` value: `runGuardsAndResolvers` defaults to
 * `paramsChange`, so `canActivate` does not re-run when a query param changes.
 * With a query param, `/settings?tab=danger` would be soft-blocked by a
 * hand-rolled `@if` and lose the guard's redirect-on-denied behaviour.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationSettingsTab {
  /**
   * Route segment under `settings/`.
   *
   * @type {string}
   */
  readonly path: string;

  /**
   * Permission scope. `audit` is gated by a platform-wide account permission,
   * every other tab by organization-member RBAC — the two cannot be checked the
   * same way, and conflating them is how the audit log ends up hidden from the
   * people entitled to it.
   *
   * @type {'organization' | 'account'}
   */
  readonly scope: 'organization' | 'account';

  /**
   * Permissions required to reach the tab.
   *
   * @type {ReadonlyArray<OrganizationPermissionName | AccountPermissionName>}
   */
  readonly permissions: ReadonlyArray<OrganizationPermissionName | AccountPermissionName>;

  /**
   * Whether every permission is required, or any one of them.
   *
   * @type {OrganizationNavigationMatch | undefined}
   */
  readonly match?: OrganizationNavigationMatch;
}

/**
 * Constant ORGANIZATION_SETTINGS_TABS
 * @const ORGANIZATION_SETTINGS_TABS
 *
 * @description
 * The settings tabs in display order. Also the order the landing guard walks
 * when `/settings` is opened with no tab: the first one the member may reach
 * wins.
 *
 * Members, roles and the audit log used to be top-level sidebar destinations.
 * They keep their own guards here — in particular the parent `settings` route
 * carries **no** guard, because a `SETTINGS_WRITE` parent would lock the
 * members list away from everyone holding only `MEMBERS_READ`.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<OrganizationSettingsTab>}
 */
export const ORGANIZATION_SETTINGS_TABS: ReadonlyArray<OrganizationSettingsTab> = [
  {
    path: 'general',
    scope: 'organization',
    permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
  },
  {
    path: 'legal',
    scope: 'organization',
    permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
  },
  {
    path: 'members',
    scope: 'organization',
    permissions: [ORGANIZATION_PERMISSION.MEMBERS_READ, ORGANIZATION_PERMISSION.MEMBERS_MANAGE],
    match: 'any',
  },
  {
    /**
     * Never the landing target in practice — any MEMBERS_MANAGE holder already
     * matches the members tab above ('any') — but listed so this catalog stays
     * the complete map of the settings children.
     */
    path: 'invitations',
    scope: 'organization',
    permissions: [ORGANIZATION_PERMISSION.MEMBERS_MANAGE],
  },
  {
    path: 'roles',
    scope: 'organization',
    permissions: [ORGANIZATION_PERMISSION.ROLES_READ, ORGANIZATION_PERMISSION.ROLES_MANAGE],
    match: 'any',
  },
  {
    path: 'audit',
    scope: 'account',
    permissions: [ACCOUNT_PERMISSION.AUDIT_READ],
  },
  {
    path: 'danger',
    scope: 'organization',
    permissions: [ORGANIZATION_PERMISSION.DELETE],
  },
];

/**
 * Function canReachOrganizationSettingsTabs
 *
 * @description
 * Whether the member can open at least one organization-scoped settings tab.
 * Drives the sidebar header's settings cog — settings left the sidebar
 * navigation, so the cog is the discoverable way in.
 *
 * Account-scoped tabs (the audit log) are deliberately ignored: the shell
 * checks organization grants through a port, and a member whose only
 * reachable tab is the audit log is a platform auditor who reaches it through
 * the command palette or a direct URL.
 *
 * @param {ReadonlySet<string>} grantedPermissions - Active member's organization grants.
 *
 * @returns {boolean} Whether the settings entry point should be offered.
 *
 * @since 1.1.0
 */
export function canReachOrganizationSettingsTabs(grantedPermissions: ReadonlySet<string>): boolean {
  const hasPermission = (permission: OrganizationPermissionName): boolean =>
    grantedPermissions.has(permission) ||
    Array.from(grantedPermissions).some((grantedPermission: string): boolean =>
      matchesOrganizationPermission(grantedPermission, permission),
    );

  return ORGANIZATION_SETTINGS_TABS.filter(
    (tab: OrganizationSettingsTab): boolean => tab.scope === 'organization',
  ).some((tab: OrganizationSettingsTab): boolean => {
    const permissions = tab.permissions as ReadonlyArray<OrganizationPermissionName>;

    return tab.match === 'any' ? permissions.some(hasPermission) : permissions.every(hasPermission);
  });
}
