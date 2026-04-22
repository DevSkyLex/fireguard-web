import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  type GuardResult,
  type MaybeAsync,
  Router,
  type UrlTree,
} from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { OrganizationPermissionGuardOptions } from './models';

/**
 * Function organizationPermissionGuard
 * @function organizationPermissionGuard
 *
 * @description
 * Creates a functional route guard that ensures the authenticated user has the
 * required effective permissions for the organization targeted by the route.
 *
 * The guard reads the `organizationId` from the current route, then delegates
 * permission loading and evaluation to
 * {@link OrganizationPermissionService}.
 *
 * @example
 * ```ts
 * {
 *   path: 'settings',
 *   canActivate: [
 *     organizationPermissionGuard({
 *       permissions: [ORGANIZATION_PERMISSION.FACILITIES_WRITE],
 *     }),
 *   ],
 * }
 * ```
 *
 * @param {OrganizationPermissionGuardOptions} options - Guard configuration.
 * @returns {CanActivateFn} A functional can-activate guard.
 */
export function organizationPermissionGuard(
  options: OrganizationPermissionGuardOptions,
): CanActivateFn {
  return (route: ActivatedRouteSnapshot): MaybeAsync<GuardResult> => {
    /**
     * Constant router
     * @const router
     *
     * @description
     * Router instance for creating UrlTree redirections when access is denied
     * or when the organizationId route parameter is missing.
     *
     * @var {Router}
     */
    const router: Router = inject<Router>(Router);

    /**
     * Constant organizationPermissionService
     * @const organizationPermissionService
     *
     * @description
     * Service responsible for checking if the user has the required permissions
     * to access the organization specified in the route parameters.
     *
     * @var {OrganizationPermissionService}
     */
    const organizationPermissionService: OrganizationPermissionService =
      inject<OrganizationPermissionService>(OrganizationPermissionService);

    /**
     * Constant organizationId
     * @const organizationId
     *
     * @description
     * The ID of the organization extracted from the route parameters.
     * This ID is used to check permissions against the targeted organization.
     *
     * @var {string | null}
     */
    const organizationId: string | null = route.paramMap.get('organizationId');

    // If no organizationId is present in the route, redirect to the home page.
    if (!organizationId) return router.createUrlTree(['/']);

    // Determine the redirection URL tree to use when access is denied,
    // based on the provided options.
    const redirectTo: ReadonlyArray<string> =
      typeof options.redirectTo === 'function'
        ? options.redirectTo(organizationId)
        : (options.redirectTo ?? ['/organizations', organizationId]);
    const redirectUrlTree: UrlTree = router.createUrlTree([...redirectTo]);

    // Check if the user has the required permissions for the organization.
    const allowed: boolean = organizationPermissionService.canAccessOrganization(
      organizationId,
      options.permissions,
      options.match ?? 'all',
    );

    return allowed ? true : redirectUrlTree;
  };
}
