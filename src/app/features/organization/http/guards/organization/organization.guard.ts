import { inject } from '@angular/core';
import { type CanActivateFn, GuardResult, MaybeAsync, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Guard organizationGuard
 *
 * @description
 * Always redirects: if the user has at least one organization,
 * navigates to `/organizations/{firstOrgId}`.
 * Otherwise redirects to `/onboarding`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {MaybeAsync<GuardResult>} A UrlTree redirecting to the appropriate route
 * based on the user's organizations.
 */
export const organizationGuard: CanActivateFn = (): MaybeAsync<GuardResult> => {
  /**
   * Constant organizationService
   * @const organizationService
   *
   * @description
   * Service for fetching organization data from the API to determine
   * the appropriate redirection path based on the user's organizations.
   *
   * @var {OrganizationService}
   */
  const organizationService: OrganizationService = inject<OrganizationService>(OrganizationService);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Router for creating redirection URL trees based on the presence
   * of user organizations.
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  // Attempt to load the first page of organizations to determine redirection
  return organizationService.list({ page: 1, itemsPerPage: 1 }).pipe(
    map((response: HydraCollection<OrganizationOutput>) => {
      if (response.totalItems > 0 && response.member.length > 0) {
        return router.createUrlTree(['/organizations', response.member[0].id]);
      }

      // No organizations: redirect to onboarding
      return router.createUrlTree(['/onboarding']);
    }),
    catchError(() => of(router.createUrlTree(['/organizations']))),
  );
};
