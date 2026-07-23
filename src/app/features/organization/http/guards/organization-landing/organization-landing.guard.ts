import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  Router,
  type UrlTree,
} from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_NAVIGATION_ITEMS,
  type OrganizationNavigationItem,
} from '@features/organization/navigation';

/**
 * Function findRouteParam
 *
 * @description
 * Resolves a route parameter from the current snapshot or one of its parents.
 *
 * @param {ActivatedRouteSnapshot} route - Snapshot from which to start.
 * @param {string} name - Route parameter name.
 *
 * @returns {string | null} Resolved parameter value when available.
 *
 * @since 1.0.0
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
 * Guard organizationLandingGuard
 *
 * @description
 * Allows the organization dashboard when available. Otherwise, redirects the
 * member to the first canonical organization destination they are permitted
 * to access.
 *
 * @since 1.0.0
 */
export const organizationLandingGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): boolean | UrlTree => {
  const router: Router = inject<Router>(Router);
  const permissionService: OrganizationPermissionService = inject<OrganizationPermissionService>(
    OrganizationPermissionService,
  );
  const organizationId: string | null = findRouteParam(route, 'organizationId');

  if (!organizationId) {
    return router.createUrlTree(['/']);
  }

  const isAccessible = (item: OrganizationNavigationItem): boolean =>
    permissionService.canAccessOrganization(organizationId, item.permissions, item.match ?? 'all');

  const dashboard: OrganizationNavigationItem | undefined = ORGANIZATION_NAVIGATION_ITEMS.find(
    (item: OrganizationNavigationItem): boolean => item.id === 'dashboard',
  );

  if (dashboard && isAccessible(dashboard)) {
    return true;
  }

  const destination: OrganizationNavigationItem | undefined = ORGANIZATION_NAVIGATION_ITEMS.find(
    (candidate: OrganizationNavigationItem): boolean =>
      candidate.id !== 'dashboard' && isAccessible(candidate),
  );

  // No permitted destination in this organization: let the default-organization
  // guard pick another workspace, excluding this one to avoid a redirect loop.
  //
  // The redirect must stay in the shell the route was activated in. The same
  // route objects are mounted under both `/organizations/:id` (dashboard) and
  // `/organizations/:id/workspace`, so a hard-coded dashboard prefix ejected a
  // member out of the workspace shell mid-session.
  const prefix: readonly string[] = isInWorkspaceShell(route)
    ? ['/organizations', organizationId, 'workspace']
    : ['/organizations', organizationId];

  return destination
    ? router.createUrlTree([...prefix, ...destination.path.split('/')])
    : router.createUrlTree(['/organizations'], { queryParams: { excluded: organizationId } });
};

/**
 * Function isInWorkspaceShell
 *
 * @description
 * Whether the activated route is mounted inside the workspace shell, read from
 * its own ancestry so a redirect lands in the shell the member is actually in.
 *
 * @param {ActivatedRouteSnapshot} route - Snapshot to inspect.
 *
 * @returns {boolean} `true` when a `workspace` segment is in the route's path.
 *
 * @since 1.1.0
 */
function isInWorkspaceShell(route: ActivatedRouteSnapshot): boolean {
  return route.pathFromRoot.some((snapshot: ActivatedRouteSnapshot): boolean =>
    snapshot.url.some((segment): boolean => segment.path === 'workspace'),
  );
}
