import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, MaybeAsync, RedirectCommand, type ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { OrganizationStore } from '@core/stores/organization';
import type { OrganizationOutput } from '@core/models/organization';

/**
 * Resolver organizationResolver
 *
 * @description
 * Fetches the organization matching the `:organizationId` route param
 * before the route activates. The resolved {@link OrganizationOutput}
 * is available in `ActivatedRoute.data['organization']`.
 *
 * On failure the user is redirected to `/` (which will trigger
 * {@link organizationGuard} to resolve the next best destination).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - The activated route snapshot containing the `:organizationId` parameter.
 *
 * @returns {Observable<OrganizationOutput>} An observable emitting the fetched organization, or EMPTY on failure.
 */
export const organizationResolver: ResolveFn<OrganizationOutput> = (
  route: ActivatedRouteSnapshot
): MaybeAsync<OrganizationOutput | RedirectCommand> => {
  /**
   * Constant organizationStore
   * @const organizationStore
   *
   * @description
   * Organization store for fetching the organization
   * data based on the route parameter.
   *
   * @var {OrganizationStore}
   */
  const organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Router for creating a redirection command in case the organization
   * cannot be resolved, ensuring the user is
   * redirected to a safe route.
   *
   * @var {Router}
   */
  const router: Router =
    inject<Router>(Router);

  // Extract organizationId from route parameters
  const organizationId: string | null = route.paramMap.get('organizationId');

  // If no organizationId is present, redirect immediately
  if (!organizationId) return new RedirectCommand(router.parseUrl('/'));

  // Attempt to resolve the organization, redirecting on failure
  return organizationStore.resolveOrganization(organizationId).pipe(
    catchError(() => of(new RedirectCommand(router.parseUrl('/')))),
  );
};
