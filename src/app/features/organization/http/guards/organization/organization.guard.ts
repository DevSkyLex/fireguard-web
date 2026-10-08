import { inject } from '@angular/core';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  GuardResult,
  MaybeAsync,
  Router,
  type UrlTree,
} from '@angular/router';
import { map, switchMap, catchError, of, type Observable } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { CookieService } from '@core/cookie';
import { LAST_ORGANIZATION_COOKIE_NAME } from '@features/organization/constants';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationLandingService } from '@features/organization/services/organization-landing';

/**
 * Function organizationGuard
 *
 * @description
 * Always redirects to the user's default organization workspace. The last
 * organization persisted in the `last-organization` cookie wins when it is
 * still accessible; otherwise the first accessible organization is used.
 * Users without any organization are sent directly to `/onboarding/workspace`.
 * The selected organization's confirmed facilities-read grant opens its fleet;
 * otherwise the historical dashboard remains its default destination.
 * An `excluded` query parameter names an organization that must not be picked
 * again (set by guards that just failed to resolve it), breaking redirect
 * loops between this guard and the organization access/landing guards.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {MaybeAsync<GuardResult>} A UrlTree redirecting to the appropriate route
 *   based on the user's organizations.
 */
export const organizationGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<GuardResult> => {
  /**
   * Constant organizationService
   *
   * @description
   * Service for fetching organization data from the API to determine
   * the appropriate redirection path based on the user's organizations.
   *
   * @const organizationService
   *
   * @var {OrganizationService}
   */
  const organizationService: OrganizationService = inject<OrganizationService>(OrganizationService);
  const landing: OrganizationLandingService = inject(OrganizationLandingService);

  /**
   * Constant cookieService
   *
   * @description
   * Cookie service used to read (and invalidate) the persisted
   * last-organization preference.
   *
   * @const cookieService
   *
   * @var {CookieService}
   */
  const cookieService: CookieService = inject<CookieService>(CookieService);

  /**
   * Constant router
   *
   * @description
   * Router for creating redirection URL trees based on the presence
   * of user organizations.
   *
   * @const router
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  // Organization that must not be picked again (loop breaker set by failing guards)
  const excludedId: string | null = route.queryParamMap.get('excluded');

  // Last organization the user worked in, persisted by the active-organization store
  const savedId: string | null = cookieService.getCookie<string>(LAST_ORGANIZATION_COOKIE_NAME);

  /**
   * Function fallbackToFirstAccessible
   *
   * @description
   * Picks the first accessible organization (skipping the excluded one) and
   * builds the redirect. No organization at all leads to onboarding; a lone
   * excluded organization leads to the forbidden page to avoid a redirect
   * loop; transport failures land on the server-error page.
   *
   * @returns {Observable<UrlTree>} Redirect target for the default workspace.
   */
  const fallbackToFirstAccessible = (): Observable<UrlTree> =>
    organizationService.list({ page: 1, itemsPerPage: 2 }).pipe(
      switchMap((response: HydraCollection<OrganizationOutput>): Observable<UrlTree> => {
        const organization: OrganizationOutput | undefined = response.member.find(
          (candidate: OrganizationOutput): boolean => candidate.id !== excludedId,
        );

        if (organization) {
          return landing
            .defaultDestination(organization.id)
            .pipe(map((destination) => router.parseUrl(destination)));
        }

        // Organizations exist but none is usable (all excluded): avoid looping
        if (response.totalItems > 0) {
          return of(router.createUrlTree(['/error/403']));
        }

        // A stale onboarding access cache must not send this account back here.
        return of(router.createUrlTree(['/onboarding/workspace']));
      }),
      catchError(() => of(router.createUrlTree(['/error/500']))),
    );

  // No usable saved preference: fall back to the first accessible organization
  if (!savedId || savedId === excludedId) {
    return fallbackToFirstAccessible();
  }

  // Validate the saved organization is still accessible before redirecting to it
  return organizationService.get(savedId).pipe(
    switchMap((organization: OrganizationOutput) =>
      landing
        .defaultDestination(organization.id)
        .pipe(map((destination) => router.parseUrl(destination))),
    ),
    catchError(() => {
      // Stale preference (organization deleted or membership revoked): forget it
      cookieService.deleteCookie(LAST_ORGANIZATION_COOKIE_NAME);
      return fallbackToFirstAccessible();
    }),
  );
};
