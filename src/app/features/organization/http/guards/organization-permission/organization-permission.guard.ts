import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  type GuardResult,
  type MaybeAsync,
  Router,
  type UrlTree,
} from '@angular/router';
import { map } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberAccessStore } from '@features/organization/state';
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
     * Constant feedback
     * @const feedback
     *
     * @description
     * App-wide feedback surface, used to say why a navigation was refused.
     *
     * @var {FeedbackService}
     */
    const feedback: FeedbackService = inject<FeedbackService>(FeedbackService);

    /**
     * Constant memberAccessStore
     * @const memberAccessStore
     *
     * @description
     * Shared organization access store, awaited so the permission read below
     * cannot land on another organization's payload.
     *
     * @var {OrganizationMemberAccessStore}
     */
    const memberAccessStore: OrganizationMemberAccessStore = inject<OrganizationMemberAccessStore>(
      OrganizationMemberAccessStore,
    );

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

    // Determine the redirection URL tree to use when access is denied, based on
    // the provided options. A denied member falls back to the organization's
    // own landing page.
    const defaultRedirect: ReadonlyArray<string> = ['/organizations', organizationId];
    const redirectTo: ReadonlyArray<string> =
      typeof options.redirectTo === 'function'
        ? options.redirectTo(organizationId)
        : (options.redirectTo ?? defaultRedirect);
    const redirectUrlTree: UrlTree = router.createUrlTree([...redirectTo]);

    // Wait for the target organization's access payload instead of assuming the
    // parent guard already loaded it. `canAccessOrganization` answers `false`
    // both for "denied" and for "not resolved yet", and the parent does not
    // reliably finish first when a navigation keeps the same leaf route node —
    // switching organization while staying on the same section, precisely. Read
    // too early, an allowed member was bounced out of the section they had just
    // opened. Resolved payloads return synchronously, so the cost is nil.
    return memberAccessStore.ensureAccessResolved(organizationId).pipe(
      map((): GuardResult => {
        const allowed: boolean = organizationPermissionService.canAccessOrganization(
          organizationId,
          options.permissions,
          options.match ?? 'all',
        );

        if (allowed) return true;

        // Name the refusal. Redirecting in silence left the member on a page
        // they had not asked for, with nothing to explain the jump —
        // indistinguishable from a broken link. The permission itself is the
        // useful part: it is what they have to ask an administrator for.
        feedback.warn(
          $localize`:@@org.permission.deniedDetail:You need the ${options.permissions.join(
            ', ',
          )}:permissions: permission to open that page.`,
          $localize`:@@org.permission.deniedSummary:Access denied`,
        );

        return redirectUrlTree;
      }),
    );
  };
}
