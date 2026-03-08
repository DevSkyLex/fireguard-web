import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, MaybeAsync, RedirectCommand, type ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ActiveFacilityStore } from '@core/stores/facility';
import type { FacilityOutput } from '@core/models/facility';

/**
 * Resolver facilityResolver
 *
 * @description
 * Fetches the facility matching the `:facilityId` route param
 * before the route activates. Requires the parent route to
 * have already resolved `:organizationId`. The resolved
 * {@link FacilityOutput} is available in `ActivatedRoute.data['facility']`.
 *
 * On failure the user is redirected to the parent organization page.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - The activated route snapshot containing the `:facilityId` parameter.
 *
 * @returns {Observable<FacilityOutput>} An observable emitting the fetched facility, or a redirect on failure.
 */
export const facilityResolver: ResolveFn<FacilityOutput> = (
  route: ActivatedRouteSnapshot
): MaybeAsync<FacilityOutput | RedirectCommand> => {
  /**
   * Constant activeFacilityStore
   * @const activeFacilityStore
   *
   * @description
   * Active facility store for fetching the facility
   * data based on the route parameters.
   *
   * @var {ActiveFacilityStore}
   */
  const activeFacilityStore: ActiveFacilityStore =
    inject<ActiveFacilityStore>(ActiveFacilityStore);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Router for creating a redirection command in case the facility
   * cannot be resolved, ensuring the user is
   * redirected to a safe route.
   *
   * @var {Router}
   */
  const router: Router =
    inject<Router>(Router);

  // Extract organizationId from parent route parameters
  const organizationId: string | null = route.parent?.paramMap.get('organizationId') ?? null;

  // Extract facilityId from route parameters
  const facilityId: string | null = route.paramMap.get('facilityId');

  // If no organizationId or facilityId is present, redirect immediately
  if (!organizationId || !facilityId) return new RedirectCommand(router.parseUrl('/'));

  // Attempt to resolve the facility, redirecting on failure
  return activeFacilityStore.resolveFacility(organizationId, facilityId).pipe(
    catchError(() => of(new RedirectCommand(router.parseUrl(`/organizations/${organizationId}`)))),
  );
};
