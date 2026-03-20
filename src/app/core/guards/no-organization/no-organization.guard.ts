import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { OrganizationService } from '@core/services/api/organization';
import { HydraCollection, OrganizationOutput } from '@app/core/models';

/**
 * Guard noOrganizationGuard
 *
 * @description
 * Allows activation only if the user has no organizations.
 * If the user has at least one organization,
 * redirects to `/` (which will trigger {@link organizationGuard}
 * to resolve the next best destination).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @return {MaybeAsync<GuardResult>} True if the user has no organizations, or a UrlTree
 * redirecting to the appropriate route otherwise.
 */
export const noOrganizationGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  /**
   * Constant organizationService
   * @const organizationService
   *
   * @description
   * Service for fetching organization data from the API to determine
   * if the user has any organizations, which affects the
   * route activation decision.
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
   * Router for creating redirection URL trees
   * based on the presence of user organizations.
   *
   * @var {Router}
   */
  const router: Router =
    inject<Router>(Router);

  // Check if the user has any organizations by fetching a single item from the list.
  return organizationService.list({ page: 1, itemsPerPage: 1 }).pipe(
    map((response: HydraCollection<OrganizationOutput>) => {
      if (response.totalItems === 0) return true;
      return router.createUrlTree(['/']);
    }),
    catchError(() => of(router.createUrlTree(['/auth/login']))),
  );
};
