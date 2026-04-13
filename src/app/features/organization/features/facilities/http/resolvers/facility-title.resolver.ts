import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { MaybeAsync, ResolveFn } from '@angular/router';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ActiveFacilityStore } from '@features/organization/features/facilities/state';
import { filter, first, map, type Observable } from 'rxjs';

/**
 * Resolver facilityTitleResolver
 *
 * @description
 * Returns the facility name as the page title or breadcrumb label.
 * Waits for the selected facility to be available in {@link ActiveFacilityStore},
 * which is populated by {@link facilityResolver}.
 *
 * Can be used as both a `title` resolver and a `breadcrumb` resolver.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {MaybeAsync<string>} The facility name, or waits for the store to be populated.
 */
export const facilityTitleResolver: ResolveFn<string> = (): MaybeAsync<string> => {
  /**
   * Constant activeFacilityStore
   * @const activeFacilityStore
   *
   * @description
   * Active facility store for accessing the currently selected facility
   * and retrieving its name for the title resolution.
   *
   * @var {ActiveFacilityStore}
   */
  const activeFacilityStore: ActiveFacilityStore =
    inject<ActiveFacilityStore>(ActiveFacilityStore);

  /**
   * Constant facility
   * @const facility
   *
   * @description
   * The currently selected facility retrieved from the store. If already
   * available (e.g. when used on a child route after the parent resolver
   * has completed), the name is returned synchronously. Otherwise, we
   * wait for the store to be populated by the parallel facilityResolver.
   *
   * @var {FacilityOutput | null}
   */
  const facility: FacilityOutput | null = activeFacilityStore.selectedFacility();

  // If the facility is already loaded (child route case), return immediately.
  if (facility) return facility.name;

  // Otherwise, wait for the facilityResolver to populate the store.
  const facility$: Observable<string> = toObservable(activeFacilityStore.selectedFacility).pipe(
    filter((f: FacilityOutput | null): f is FacilityOutput => f !== null),
    map((f: FacilityOutput) => f.name),
    first(),
  );

  return facility$;
};
