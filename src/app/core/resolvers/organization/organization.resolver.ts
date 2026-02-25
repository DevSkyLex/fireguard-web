import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, MaybeAsync, RedirectCommand, type ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { OrganizationService } from '@core/services/api/organization';
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
   * Constant organizationService
   * @const organizationService
   *
   * @description
   * Service for fetching organization data from the API.
   *
   * @var {OrganizationService}
   */
  const organizationService: OrganizationService =
    inject<OrganizationService>(OrganizationService);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Router for navigating to fallback routes if
   * the organization fetch fails.
   *
   * @var {Router}
   */
  const router: Router =
    inject<Router>(Router);

  /**
   * Constant organizationId
   * @const organizationId
   *
   * @description
   * The `:organizationId` route parameter used to fetch
   * the organization. If this parameter is missing,
   * the resolver immediately redirects to `/` and returns null.
   *
   * @var {string | null}
   */
  const organizationId: string | null = route.paramMap.get('organizationId');

  if (!organizationId) {
    return new RedirectCommand(router.parseUrl('/'));
  }

  return organizationService.get(organizationId).pipe(
    catchError(() => of(new RedirectCommand(router.parseUrl('/')))),
  );
};
