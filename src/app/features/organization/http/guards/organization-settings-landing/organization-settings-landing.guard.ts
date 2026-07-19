import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  Router,
  type UrlTree,
} from '@angular/router';
import { UserPermissionService, type AccountPermissionName } from '@features/account';
import { OrganizationPermissionService } from '@features/organization/access';
import type { OrganizationPermissionName } from '@features/organization/models';
import {
  ORGANIZATION_SETTINGS_TABS,
  type OrganizationSettingsTab,
} from '@features/organization/navigation';

/**
 * Walks up to the nearest `:organizationId`.
 *
 * @param {ActivatedRouteSnapshot} route the activated route
 * @param {string} name the parameter name
 *
 * @returns {string | null} the parameter value, or null
 */
function findRouteParam(route: ActivatedRouteSnapshot, name: string): string | null {
  let currentRoute: ActivatedRouteSnapshot | null = route;

  while (currentRoute) {
    const value: string | null = currentRoute.paramMap.get(name);

    if (value) {
      return value;
    }

    currentRoute = currentRoute.parent;
  }

  return null;
}

/**
 * Guard organizationSettingsLandingGuard
 * @const organizationSettingsLandingGuard
 *
 * @description
 * Redirects a bare `/settings` to the first tab the member may actually open.
 *
 * The parent `settings` route carries no permission guard of its own — it used
 * to require `SETTINGS_WRITE`, which would now lock the members list away from
 * everyone holding only `MEMBERS_READ`, and the audit log away from holders of
 * the platform-wide `audit.read`. Access is decided tab by tab instead, and
 * this guard only picks the landing one.
 *
 * A member entitled to no tab at all is sent back to the organization overview
 * rather than left on an empty shell.
 *
 * @since 1.0.0
 */
export const organizationSettingsLandingGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): boolean | UrlTree => {
  const router: Router = inject<Router>(Router);
  const organizationPermissions: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);
  const accountPermissions: UserPermissionService =
    inject<UserPermissionService>(UserPermissionService);
  const organizationId: string | null = findRouteParam(route, 'organizationId');

  if (!organizationId) {
    return router.createUrlTree(['/']);
  }

  const isAccessible = (tab: OrganizationSettingsTab): boolean => {
    if (tab.scope === 'account') {
      return accountPermissions.hasAnyPermission(
        tab.permissions as ReadonlyArray<AccountPermissionName>,
      );
    }

    return organizationPermissions.canAccessOrganization(
      organizationId,
      tab.permissions as ReadonlyArray<OrganizationPermissionName>,
      tab.match ?? 'all',
    );
  };

  const target: OrganizationSettingsTab | undefined = ORGANIZATION_SETTINGS_TABS.find(isAccessible);

  if (!target) {
    return router.createUrlTree(['/organizations', organizationId]);
  }

  return router.createUrlTree(['/organizations', organizationId, 'settings', target.path]);
};
