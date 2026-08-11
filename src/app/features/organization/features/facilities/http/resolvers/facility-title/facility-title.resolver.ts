import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, MaybeAsync, ResolveFn } from '@angular/router';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ActiveFacilityStore } from '@features/organization/features/facilities/state';

/**
 * Resolver facilityTitleResolver
 *
 * @description
 * Returns the route title synchronously so navigation never waits on it: the
 * facility name when {@link ActiveFacilityStore} already holds the facility
 * matching `:facilityId`, a neutral section label otherwise. Once the seeded
 * fetch lands, the detail page re-sets the document title through
 * `TitleService`, which also refreshes the breadcrumb's current-page label.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - The activated route snapshot carrying `:facilityId`.
 *
 * @returns {MaybeAsync<string>} The facility name, or the neutral section label.
 */
export const facilityTitleResolver: ResolveFn<string> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<string> => {
  const activeFacilityStore: ActiveFacilityStore = inject<ActiveFacilityStore>(ActiveFacilityStore);
  const facility: FacilityOutput | null = activeFacilityStore.selectedFacility();
  const facilityId: string | null = route.paramMap.get('facilityId');

  return facility && facility.id === facilityId
    ? facility.name
    : $localize`:@@route.facility.detail:Facility`;
};
