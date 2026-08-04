import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  type GuardResult,
  type MaybeAsync,
  Router,
} from '@angular/router';
import { map } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_NAVIGATION_ITEMS,
  type OrganizationNavigationItem,
} from '@features/organization/navigation';
import { OrganizationMemberAccessStore } from '@features/organization/state';

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
 * **Waits for the target organization's access payload rather than assuming an
 * upstream guard already loaded it.** `canAccessOrganization` answers `false`
 * both for "denied" and for "not resolved yet", and the parent
 * `organizationAccessGuard` does not reliably finish first when a navigation
 * keeps the same leaf route node — switching organization while staying on the
 * landing route, precisely. Read too early, every destination looked forbidden
 * and the member was bounced back to the organization they were leaving.
 * `ensureAccessResolved` returns synchronously once the payload is in the store,
 * so the common case costs nothing.
 *
 * @since 1.1.0
 */
export const organizationLandingGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<GuardResult> => {
  const router: Router = inject<Router>(Router);
  const permissionService: OrganizationPermissionService = inject<OrganizationPermissionService>(
    OrganizationPermissionService,
  );
  const memberAccessStore: OrganizationMemberAccessStore = inject<OrganizationMemberAccessStore>(
    OrganizationMemberAccessStore,
  );
  const organizationId: string | null = findRouteParam(route, 'organizationId');

  if (!organizationId) {
    return router.createUrlTree(['/']);
  }

  return memberAccessStore.ensureAccessResolved(organizationId).pipe(
    map((): GuardResult => {
      const isAccessible = (item: OrganizationNavigationItem): boolean =>
        permissionService.canAccessOrganization(
          organizationId,
          item.permissions,
          item.match ?? 'all',
        );

      const dashboard: OrganizationNavigationItem | undefined = ORGANIZATION_NAVIGATION_ITEMS.find(
        (item: OrganizationNavigationItem): boolean => item.id === 'dashboard',
      );

      if (dashboard && isAccessible(dashboard)) {
        return true;
      }

      const destination: OrganizationNavigationItem | undefined =
        ORGANIZATION_NAVIGATION_ITEMS.find(
          (candidate: OrganizationNavigationItem): boolean =>
            candidate.id !== 'dashboard' && isAccessible(candidate),
        );

      // No permitted destination in this organization: let the
      // default-organization guard pick another workspace, excluding this one
      // to avoid a redirect loop.
      return destination
        ? router.createUrlTree(['/organizations', organizationId, ...destination.path.split('/')])
        : router.createUrlTree(['/organizations'], { queryParams: { excluded: organizationId } });
    }),
  );
};
