import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  MaybeAsync,
  RedirectCommand,
  type ResolveFn,
  Router,
} from '@angular/router';
import { ActiveFacilityStore } from '@features/organization/features/facilities/state';

/**
 * Resolver facilityResolver
 *
 * @description
 * Seeds {@link ActiveFacilityStore} with the `:facilityId` route param and
 * returns immediately, so route activation never waits on the network: the
 * detail page paints its skeleton from the store's pending state instead of
 * leaving the app blank on a slow connection. The store remains the single
 * loading path for the record; a fetch failure surfaces there and the page
 * redirects back to the organization landing page. Only a malformed URL
 * (missing ids) redirects from here.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - The activated route snapshot carrying `:facilityId`.
 *
 * @returns {MaybeAsync<boolean | RedirectCommand>} `true` once the load is seeded, or a redirect on malformed ids.
 */
export const facilityResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<boolean | RedirectCommand> => {
  const activeFacilityStore: ActiveFacilityStore = inject<ActiveFacilityStore>(ActiveFacilityStore);
  const router: Router = inject<Router>(Router);
  const organizationId: string | null = route.parent?.paramMap.get('organizationId') ?? null;
  const facilityId: string | null = route.paramMap.get('facilityId');

  if (!organizationId || !facilityId) return new RedirectCommand(router.parseUrl('/'));

  activeFacilityStore.resolveFacility({ organizationId, facilityId });

  return true;
};
