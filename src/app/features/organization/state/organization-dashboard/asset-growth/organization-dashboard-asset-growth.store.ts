import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, forkJoin, pipe, switchMap } from 'rxjs';
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
  OrganizationDashboardEquipmentStatus,
  OrganizationDashboardEquipmentType,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendResourceParams,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  buildDashboardTrendBaseParams,
  withDashboardFilterState,
} from '../organization-dashboard-filter.feature';

/**
 * Type OrganizationDashboardAssetGrowthData
 * @type OrganizationDashboardAssetGrowthData
 *
 * @description
 * Combined payload returned by the parallel equipment + facilities
 * trend requests. Stored in state after a successful {@link load} call.
 *
 * @since 1.0.0
 */
type OrganizationDashboardAssetGrowthData = {
  readonly equipment: OrganizationDashboardTrendOutput;
  readonly facilities: OrganizationDashboardTrendOutput;
};

/**
 * Type OrganizationDashboardAssetGrowthParams
 * @type OrganizationDashboardAssetGrowthParams
 *
 * @description
 * Parameters forwarded to the API on each load. Extends the base
 * trend resource params with equipment and facility dimension filters.
 *
 * @since 1.0.0
 */
type OrganizationDashboardAssetGrowthParams = OrganizationDashboardTrendResourceParams & {
  readonly equipmentType?: OrganizationDashboardEquipmentType;
  readonly equipmentStatus?: OrganizationDashboardEquipmentStatus;
  readonly facilityType?: FacilityType;
};

/**

 * Store OrganizationDashboardAssetGrowthStore
 * @const OrganizationDashboardAssetGrowthStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Asset Growth Momentum**
 * dashboard card. Manages filter state, orchestrates parallel API calls
 * for equipment-created and facilities-created trends, and exposes
 * fully derived chart data and summary KPI metrics as computed signals.
 *
 * Designed to be provided at **component level** (`providers: [OrganizationDashboardAssetGrowthStore]`),
 * so each card instance owns an independent, lifecycle-bound copy of the store.
 *
 * ### Reactive load flow
 * On `onInit`, a `computed` signal is built from all filter-state signals and
 * passed to {@link load} via `rxMethod`. Angular's effect system re-evaluates
 * the computed whenever any dependency changes, automatically triggering a new
 * parallel fetch without any imperative coordination in the component.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardAssetGrowthStore] })
 * export class OrganizationDashboardAssetGrowthTrend {
 *   protected readonly store = inject(OrganizationDashboardAssetGrowthStore);
 * }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationDashboardAssetGrowthStore = signalStore(
  //#region State

  /**
   * Feature withState
   *
   * @description
   * Seeds the store with the initial filter state and async-operation
   * flags. All keys become deeply-signal-wrapped `SignalState` entries
   * that expose typed read signals on the store instance.
   *
   * @since 2.0.0
   */
  withQueryState<OrganizationDashboardAssetGrowthData>(),
  withDashboardFilterState(),
  withState({
    selectedEquipmentType: null as OrganizationDashboardEquipmentType | null,
    selectedEquipmentStatus: null as OrganizationDashboardEquipmentStatus | null,
    selectedFacilityType: null as FacilityType | null,
  }),

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
   * @since 2.0.0
   */
  withMethods((store, organizationService = inject(OrganizationService)) => ({
    load: rxMethod<OrganizationDashboardAssetGrowthParams | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;

          patchState(store, setPendingQuery());

          return forkJoin({
            equipment: organizationService.getDashboardEquipmentCreatedTrend(
              params.organizationId,
              {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
                equipmentType: params.equipmentType,
                equipmentStatus: params.equipmentStatus,
              },
            ),
            facilities: organizationService.getDashboardFacilitiesCreatedTrend(
              params.organizationId,
              {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
                facilityType: params.facilityType,
              },
            ),
          }).pipe(
            tapResponse({
              next: (data) => patchState(store, setSuccessQuery(data)),
              error: (err) => patchState(store, setErrorQuery(toStoreError(err))),
            }),
          );
        }),
      ),
    ),

    /**
     * Method setEquipmentType
     *
     * @description
     * Updates the optional equipment-type dimension filter.
     *
     * @param {OrganizationDashboardEquipmentType | null} equipmentType - New filter value, or null.
     * @returns {void}
     *
     * @since 2.0.0
     */
    setEquipmentType(equipmentType: OrganizationDashboardEquipmentType | null): void {
      patchState(store, { selectedEquipmentType: equipmentType });
    },

    /**
     * Method setEquipmentStatus
     *
     * @description
     * Updates the optional equipment-status dimension filter.
     *
     * @param {OrganizationDashboardEquipmentStatus | null} equipmentStatus - New filter value, or null.
     * @returns {void}
     *
     * @since 2.0.0
     */
    setEquipmentStatus(equipmentStatus: OrganizationDashboardEquipmentStatus | null): void {
      patchState(store, { selectedEquipmentStatus: equipmentStatus });
    },

    /**
     * Method setFacilityType
     *
     * @description
     * Updates the optional facility-type dimension filter.
     *
     * @param {FacilityType | null} facilityType - New filter value, or null.
     * @returns {void}
     *
     * @since 2.0.0
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
   * Wires the reactive reload pipeline on `onInit`. A `computed` signal
   * is derived from all filter-state signals; any state change causes the
   * computed to emit a new value, which `rxMethod` picks up via Angular's
   * internal effect subscription to fire a new fetch automatically.
   *
   * @since 2.0.0
   */
  withHooks((store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject(ActiveOrganizationStore);

    return {
      /**
       * Hook onInit
       *
       * @description
       * Builds the params `computed` from all filter-state signals and
       * passes it to {@link load}. NgRx subscribes to the computed via
       * an internal effect, so any downstream filter change automatically
       * triggers a fresh parallel fetch.
       *
       * @returns {void}
       *
       * @since 2.0.0
       */
      onInit(): void {
        const params = computed<OrganizationDashboardAssetGrowthParams | undefined>(() => {
          if (!isPlatformBrowser(platformId)) return undefined;

          const organization = activeOrganizationStore.selectedOrganization();

          if (!organization) return undefined;

          const baseParams = buildDashboardTrendBaseParams(store);

          if (!baseParams) return undefined;

          return {
            organizationId: organization.id,
            ...baseParams,
            equipmentType: store.selectedEquipmentType() ?? undefined,
            equipmentStatus: store.selectedEquipmentStatus() ?? undefined,
            facilityType: store.selectedFacilityType() ?? undefined,
          };
        });

        store.load(params);
      },
    };
  }),

  //#endregion
);

/**
 * Type OrganizationDashboardAssetGrowthStore
 * @type OrganizationDashboardAssetGrowthStore
 *
 * @description
 * Instance type of the {@link OrganizationDashboardAssetGrowthStore}
 * signal store. Use this type for constructor-parameter and property
 * type annotations throughout the dashboard card component and its tests.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationDashboardAssetGrowthStore = InstanceType<
  typeof OrganizationDashboardAssetGrowthStore
>;
