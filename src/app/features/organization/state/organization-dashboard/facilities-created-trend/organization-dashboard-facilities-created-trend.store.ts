import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/state/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type { FacilityType } from '@features/organization/features/facilities/models';
import type {
  OrganizationDashboardFacilityTrendResourceParams,
  OrganizationDashboardTrendOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  buildDashboardTrendBaseParams,
  withDashboardFilterState,
} from '../organization-dashboard-filter.feature';

/**
 * Store OrganizationDashboardFacilitiesCreatedStore
 * @const OrganizationDashboardFacilitiesCreatedStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Facilities Created**
 * dashboard trend card. Manages facility-type filter state, fires the
 * `getDashboardFacilitiesCreatedTrend` API call reactively, and exposes
 * fully derived chart data and summary metrics.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardFacilitiesCreatedStore] })
 * export class OrganizationDashboardFacilitiesCreatedTrend {
 *   protected readonly store = inject(OrganizationDashboardFacilitiesCreatedStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationDashboardFacilitiesCreatedStore = signalStore(
  //#region State

  /**
   * Feature withState
   *
   * @description
   * Seeds the store with the initial filter state and async-operation
   * flags. All keys become deeply-signal-wrapped `SignalState` entries
   * that expose typed read signals on the store instance.
   *
   * @since 1.0.0
   */
  withQueryState<OrganizationDashboardTrendOutput>(),
  withDashboardFilterState(),
  withState({ selectedFacilityType: null as FacilityType | null }),
  //#endregion

  //#region Methods

  /**
   * Feature withMethods
   *
   * @description
   * Adds the main async load action and all synchronous filter-state
   * mutation methods. Every setter patches state via `patchState`; the
   * reactive load flow is driven automatically by `withHooks`.
   *
   * @since 1.0.0
   */
  withMethods((store, organizationService = inject(OrganizationService)) => ({
    /**
     * Method load
     *
     * @description
     * NgRx `rxMethod` that fetches the facilities-created trend dataset
     * whenever the params signal emits a new value.
     * Undefined params are silently ignored via an `EMPTY` return.
     *
     * @since 1.0.0
     */
    load: rxMethod<OrganizationDashboardFacilityTrendResourceParams | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;

          patchState(store, setPendingQuery());

          return organizationService
            .getDashboardFacilitiesCreatedTrend(params.organizationId, {
              granularity: params.granularity,
              from: params.from,
              to: params.to,
              compare: params.compare,
              facilityType: params.facilityType,
            })
            .pipe(
              tapResponse({
                next: (data) => patchState(store, setSuccessQuery(data)),
                error: (err) => patchState(store, setErrorQuery(toStoreError(err))),
              }),
            );
        }),
      ),
    ),

    /**
     * Method setFacilityType
     *
     * @description
     * Updates the active facility-type filter. Triggers a new fetch.
     *
     * @param {FacilityType | null} facilityType - New facility type, or null to clear.
     * @returns {void}
     * @since 1.0.0
     */
    setFacilityType(facilityType: FacilityType | null): void {
      patchState(store, { selectedFacilityType: facilityType });
    },
  })),
  //#endregion

  //#region Hooks

  /**
   * Feature withHooks
   *
   * @description
   * Wires up the reactive data-fetching effect on store init.
   *
   * @since 1.0.0
   */
  withHooks((store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject(ActiveOrganizationStore);

    return {
      /**
       * Hook onInit
       *
       * @description
       * Builds a `computed` signal from all filter-state dependencies and
       * connects it to {@link load} via `rxMethod`. Angular's signal graph
       * re-evaluates the computed automatically whenever any dependency changes,
       * triggering a new API request without any imperative coordination.
       *
       * @returns {void}
       */
      onInit(): void {
        const params = computed<OrganizationDashboardFacilityTrendResourceParams | undefined>(
          () => {
            if (!isPlatformBrowser(platformId)) return undefined;

            const organization = activeOrganizationStore.selectedOrganization();
            if (!organization) return undefined;

            const baseParams = buildDashboardTrendBaseParams(store);
            if (!baseParams) return undefined;

            return {
              organizationId: organization.id,
              ...baseParams,
              facilityType: store.selectedFacilityType() ?? undefined,
            };
          },
        );

        store.load(params);
      },
    };
  }),
  //#endregion
);

/**
 * Type OrganizationDashboardFacilitiesCreatedStore
 * @type OrganizationDashboardFacilitiesCreatedStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationDashboardFacilitiesCreatedStore = InstanceType<
  typeof OrganizationDashboardFacilitiesCreatedStore
>;
