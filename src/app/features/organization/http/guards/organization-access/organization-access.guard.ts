import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  type GuardResult,
  type MaybeAsync,
  Router,
} from '@angular/router';
import { map } from 'rxjs';
import { OrganizationMemberAccessStore } from '@features/organization/state';

/**
 * Constant ROOT_REDIRECT
 * @const ROOT_REDIRECT
 *
 * @description
 * Absolute route segments to redirect to when the
 * organization ID is missing from the route.
 *
 * @type ReadonlyArray<string>
 */
const ROOT_REDIRECT: ReadonlyArray<string> = ['/'];

/**
 * Constant ORGANIZATIONS_REDIRECT
 * @const ORGANIZATIONS_REDIRECT
 *
 * @description
 * Absolute route segments to redirect to when the
 * organization access payload fails to resolve in the store.
 *
 * @type ReadonlyArray<string>
 */
const ORGANIZATIONS_REDIRECT: ReadonlyArray<string> = ['/organizations'];

/**
 * Guard organizationAccessGuard
 *
 * @description
 * Ensures the organization-scoped access payload is loaded in the shared store
 * before child organization permission guards run.
 *
 * This guard centralizes the `/api/organizations/{id}/me` loading workflow so
 * permission guards and permission services only need to read the store.
 *
 * @returns {CanActivateFn} A functional can-activate guard.
 */
export const organizationAccessGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<GuardResult> => {
  /**
   * Constant router
   * @const router
   *
   * @description
   * Angular Router instance used for navigation
   * and URL tree creation.
   *
   * @type {Router}
   */
  const router: Router = inject<Router>(Router);

  /**
   * Constant organizationMemberAccessStore
   * @const organizationMemberAccessStore
   *
   * @description
   * Shared store managing the organization access payload.
   * The guard relies on the `ensureAccessResolved` method to load the payload
   * if not already present and determine access.
   *
   * @type {OrganizationMemberAccessStore}
   */
  const organizationMemberAccessStore: OrganizationMemberAccessStore =
    inject<OrganizationMemberAccessStore>(OrganizationMemberAccessStore);

  // Extract the organization ID from the route parameters
  const organizationId: string | null = route.paramMap.get('organizationId');

  // If the organization ID is missing, redirect to the root or a default page
  if (!organizationId) return router.createUrlTree([...ROOT_REDIRECT]);

  // Ensure the organization access payload is resolved in the store and determine access
  return organizationMemberAccessStore
    .ensureAccessResolved(organizationId)
    .pipe(
      map(
        (isResolved: boolean): GuardResult =>
          isResolved ? true : router.createUrlTree([...ORGANIZATIONS_REDIRECT]),
      ),
    );
};
