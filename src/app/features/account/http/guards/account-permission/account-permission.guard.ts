import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  type GuardResult,
  type MaybeAsync,
  Router,
  type UrlTree,
} from '@angular/router';
import { UserPermissionService } from '@features/account/access';
import type { AccountPermissionGuardOptions } from './models';

/**
 * Function accountPermissionGuard
 * @function accountPermissionGuard
 *
 * @description
 * Creates a functional route guard that ensures the authenticated user has the
 * required global permissions to access the target route.
 *
 * The guard reads the current permission state from `UserPermissionService`,
 * which itself remains a read-only facade over the account-owned `UserStore`.
 *
 * @param {AccountPermissionGuardOptions} options - Guard configuration.
 * @returns {CanActivateFn} A functional can-activate guard.
 */
export function accountPermissionGuard(options: AccountPermissionGuardOptions): CanActivateFn {
  return (_route: ActivatedRouteSnapshot): MaybeAsync<GuardResult> => {
    /**
     * Constant router
     * @const router
     *
     * @description
     * Router instance for creating UrlTree
     * redirections when access is denied.
     *
     * @type {Router}
     */
    const router: Router = inject<Router>(Router);

    /**
     * Constant userPermissionService
     * @const userPermissionService
     *
     * @description
     * UserPermissionService instance used to evaluate the
     * user's global permissions against the guard's
     * required permissions.
     *
     * @type {UserPermissionService}
     */
    const userPermissionService: UserPermissionService =
      inject<UserPermissionService>(UserPermissionService);

    // Determine the redirection URL tree based on the guard options
    const redirectTo: ReadonlyArray<string> =
      typeof options.redirectTo === 'function'
        ? options.redirectTo()
        : (options.redirectTo ?? ['/']);
    const redirectUrlTree: UrlTree = router.createUrlTree([...redirectTo]);

    // Evaluate whether the user has the required permissions based on the specified match strategy
    const allowed: boolean = userPermissionService.canAccessGlobalPermissions(
      options.permissions,
      options.match ?? 'all',
    );

    // If allowed is true, return true to grant access; otherwise,
    // return the UrlTree to redirect
    return allowed ? true : redirectUrlTree;
  };
}
