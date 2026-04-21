import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, forkJoin, of, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/state/request-state';
import { OrganizationPermissionService } from '@features/organization/access/services/organization-permission/organization-permission.service';
import { OrganizationService } from '@features/organization/data-access';
import type { FacilityType } from '@features/organization/features/facilities/models';
import type {
  OrganizationDashboardEquipmentStatus,
  OrganizationDashboardEquipmentType,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendResourceParams,
} from '@features/organization/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  alignDashboardTrendSeries,
  type AlignedDashboardTrendSeries,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import {
  buildDashboardTrendBaseParams,
  cloneDashboardDateRange,
  getDashboardInitialFilterDraftState,
  normalizeDashboardDateRange,
  withDashboardFilterState,
} from '../../features';
import {
  DASHBOARD_PERSISTENCE_VERSION,
  type PersistedDashboardBaseFilters,
  buildDashboardStorageKey,
  deserializeDateRange,
  readDashboardStorage,
  serializeDateRange,
  writeDashboardStorage,
} from '../../utils';

/**
 * Type PersistedAssetGrowthFilters
 *
 * @description
 * Shape of the persisted asset-growth filter payload stored in
 * `localStorage`. Extends the base dashboard filter fields with the three
 * dimension filters specific to this widget.
 *
 * @since 1.0.0
 */
type PersistedAssetGrowthFilters = PersistedDashboardBaseFilters & {
  readonly equipmentType: OrganizationDashboardEquipmentType | null;
  readonly equipmentStatus: OrganizationDashboardEquipmentStatus | null;
  readonly facilityType: FacilityType | null;
};

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
  readonly equipment: OrganizationDashboardTrendOutput | null;
  readonly facilities: OrganizationDashboardTrendOutput | null;
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
  readonly includeEquipment: boolean;
  readonly includeFacilities: boolean;
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
function createAssetGrowthTrendStore() {
  return signalStore(
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
  withState(getDashboardInitialFilterDraftState()),
  withState({
    selectedEquipmentType: null as OrganizationDashboardEquipmentType | null,
    selectedEquipmentStatus: null as OrganizationDashboardEquipmentStatus | null,
    selectedFacilityType: null as FacilityType | null,
    draftEquipmentType: null as OrganizationDashboardEquipmentType | null,
    draftEquipmentStatus: null as OrganizationDashboardEquipmentStatus | null,
    draftFacilityType: null as FacilityType | null,
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
            equipment: params.includeEquipment
              ? organizationService.getDashboardEquipmentCreatedTrend(params.organizationId, {
                  granularity: params.granularity,
                  from: params.from,
                  to: params.to,
                  compare: params.compare,
                  equipmentType: params.equipmentType,
                  equipmentStatus: params.equipmentStatus,
                })
              : of(null),
            facilities: params.includeFacilities
              ? organizationService.getDashboardFacilitiesCreatedTrend(params.organizationId, {
                  granularity: params.granularity,
                  from: params.from,
                  to: params.to,
                  compare: params.compare,
                  facilityType: params.facilityType,
                })
              : of(null),
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

    /**
     * Method setDraftDateRange
     *
     * @description
     * Updates the draft date range edited inside the filter drawer.
     *
     * @param {Date[] | null} range - Draft range selected by the user.
     * @returns {void}
     */
    setDraftDateRange(range: Date[] | null): void {
      patchState(store, {
        draftDateRange: normalizeDashboardDateRange(range, store.selectedGranularity()),
      });
    },

    /**
     * Method setDraftCompareEnabled
     *
     * @description
     * Updates the draft compare-mode toggle edited inside the filter drawer.
     *
     * @param {boolean} compareEnabled - Draft compare-mode value.
     * @returns {void}
     */
    setDraftCompareEnabled(compareEnabled: boolean): void {
      patchState(store, { draftCompareEnabled: compareEnabled });
    },

    /**
     * Method setDraftEquipmentType
     *
     * @description
     * Updates the draft equipment-type value edited inside the filter drawer.
     *
     * @param {OrganizationDashboardEquipmentType | null} equipmentType - Draft equipment type.
     * @returns {void}
     */
    setDraftEquipmentType(equipmentType: OrganizationDashboardEquipmentType | null): void {
      patchState(store, { draftEquipmentType: equipmentType });
    },

    /**
     * Method setDraftEquipmentStatus
     *
     * @description
     * Updates the draft equipment-status value edited inside the filter drawer.
     *
     * @param {OrganizationDashboardEquipmentStatus | null} equipmentStatus - Draft equipment status.
     * @returns {void}
     */
    setDraftEquipmentStatus(
      equipmentStatus: OrganizationDashboardEquipmentStatus | null,
    ): void {
      patchState(store, { draftEquipmentStatus: equipmentStatus });
    },

    /**
     * Method setDraftFacilityType
     *
     * @description
     * Updates the draft facility-type value edited inside the filter drawer.
     *
     * @param {FacilityType | null} facilityType - Draft facility type.
     * @returns {void}
     */
    setDraftFacilityType(facilityType: FacilityType | null): void {
      patchState(store, { draftFacilityType: facilityType });
    },

    /**
     * Method openFilters
     *
     * @description
     * Opens the filter drawer and seeds the draft values from the applied filters.
     *
     * @returns {void}
     */
    openFilters(): void {
      patchState(store, {
        isFilterDrawerVisible: true,
        draftDateRange: cloneDashboardDateRange(store.selectedDateRange()),
        draftCompareEnabled: store.compareEnabled(),
        draftEquipmentType: store.selectedEquipmentType(),
        draftEquipmentStatus: store.selectedEquipmentStatus(),
        draftFacilityType: store.selectedFacilityType(),
      });
    },

    /**
     * Method cancelDraftFilters
     *
     * @description
     * Closes the filter drawer and restores the draft values from the applied filters.
     *
     * @returns {void}
     */
    cancelDraftFilters(): void {
      patchState(store, {
        isFilterDrawerVisible: false,
        draftDateRange: cloneDashboardDateRange(store.selectedDateRange()),
        draftCompareEnabled: store.compareEnabled(),
        draftEquipmentType: store.selectedEquipmentType(),
        draftEquipmentStatus: store.selectedEquipmentStatus(),
        draftFacilityType: store.selectedFacilityType(),
      });
    },

    /**
     * Method resetDraftFilters
     *
     * @description
     * Resets the drawer draft values back to their default state without applying them.
     *
     * @returns {void}
     */
    resetDraftFilters(): void {
      const initialDraftState = getDashboardInitialFilterDraftState();

      patchState(store, {
        draftDateRange: initialDraftState.draftDateRange,
        draftCompareEnabled: initialDraftState.draftCompareEnabled,
        draftEquipmentType: null,
        draftEquipmentStatus: null,
        draftFacilityType: null,
      });
    },

    /**
     * Method applyDraftFilters
     *
     * @description
     * Commits the current drawer draft values to the reactive filter state in one patch.
     *
     * @returns {void}
     */
    applyDraftFilters(): void {
      patchState(store, {
        isFilterDrawerVisible: false,
        selectedDateRange: cloneDashboardDateRange(store.draftDateRange()),
        compareEnabled: store.draftCompareEnabled(),
        selectedEquipmentType: store.draftEquipmentType(),
        selectedEquipmentStatus: store.draftEquipmentStatus(),
        selectedFacilityType: store.draftFacilityType(),
      });
    },

  })),

  //#endregion

  //#region Computed

  /**
   * Feature withComputed
   *
   * @description
   * Derives the aligned trend series shared by the chart and summary metrics.
   *
   * @since 2.0.0
   */
  withComputed((
    store,
    organizationPermissionService = inject(OrganizationPermissionService),
  ) => ({
    canReadEquipment: computed<boolean>(() =>
      organizationPermissionService.hasPermission(
        ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ),
    ),
    canReadFacilities: computed<boolean>(() =>
      organizationPermissionService.hasPermission(
        ORGANIZATION_PERMISSION.FACILITIES_READ,
      ),
    ),
    alignedTrendData: computed<AlignedDashboardTrendSeries>(() => {
      const growth: ReturnType<typeof store.queryData> = store.queryData();
      return alignDashboardTrendSeries(
        [growth?.equipment?.series, growth?.facilities?.series],
        store.selectedGranularity(),
      );
    }),
  })),

  //#endregion

  //#region Hooks

  /**
   * Feature withComputed (load params)
   *
   * @description
   * Derives the fully assembled API parameters object from all filter-state
   * signals. Declared in `withComputed` so that derived state is not
   * created imperatively inside `onInit`.
   *
   * @since 2.0.0
   */
  withComputed((store) => {
    const platformId: Object = inject(PLATFORM_ID);
    const activeOrganizationStore: ActiveOrganizationStore = inject(ActiveOrganizationStore);

    return {
      loadParams: computed<OrganizationDashboardAssetGrowthParams | undefined>(() => {
        if (!isPlatformBrowser(platformId)) return undefined;

        const includeEquipment: boolean = store.canReadEquipment();
        const includeFacilities: boolean = store.canReadFacilities();

        if (!includeEquipment && !includeFacilities) {
          return undefined;
        }

        const organization: ReturnType<typeof activeOrganizationStore.selectedOrganization> =
          activeOrganizationStore.selectedOrganization();
        if (!organization) return undefined;

        const baseParams: ReturnType<typeof buildDashboardTrendBaseParams> =
          buildDashboardTrendBaseParams(store);
        if (!baseParams) return undefined;

        return {
          organizationId: organization.id,
          includeEquipment,
          includeFacilities,
          ...baseParams,
          equipmentType: includeEquipment ? (store.selectedEquipmentType() ?? undefined) : undefined,
          equipmentStatus: includeEquipment
            ? (store.selectedEquipmentStatus() ?? undefined)
            : undefined,
          facilityType: includeFacilities ? (store.selectedFacilityType() ?? undefined) : undefined,
        };
      }),
    };
  }),

  /**
   * Feature withHooks
   *
   * @description
   * Wires up the reactive data-fetching effect on store init.
   *
   * @since 2.0.0
   */
  withHooks((store) => {
    const platformId: Object = inject(PLATFORM_ID);
    const activeOrganizationStore: ActiveOrganizationStore = inject(ActiveOrganizationStore);

    return {
      /**
       * Hook onInit
       *
       * @description
       * Restores persisted filters, connects {@link loadParams} to
       * {@link load} via `rxMethod`, and registers the persistence
       * write-back effect.
       *
       * @returns {void}
       *
       * @since 2.0.0
       */
      onInit(): void {
        // === Persistence: Hydration ===
        if (isPlatformBrowser(platformId)) {
          const organization: ReturnType<typeof activeOrganizationStore.selectedOrganization> =
            activeOrganizationStore.selectedOrganization();
          if (organization) {
            const key: string = buildDashboardStorageKey(organization.id, 'asset-growth');
            const saved: PersistedAssetGrowthFilters | null =
              readDashboardStorage<PersistedAssetGrowthFilters>(key);
            if (saved) {
              patchState(store, {
                selectedGranularity: saved.granularity,
                compareEnabled: saved.compareEnabled,
                selectedEquipmentType: saved.equipmentType,
                selectedEquipmentStatus: saved.equipmentStatus,
                selectedFacilityType: saved.facilityType,
              });
              store.setDateRange(deserializeDateRange(saved.dateRange));
            }
          }
        }

        // === Reactive load ===
        store.load(store.loadParams);

        // === Persistence: Write effect ===
        effect(() => {
          if (!isPlatformBrowser(platformId)) return;
          const organization: ReturnType<typeof activeOrganizationStore.selectedOrganization> =
            activeOrganizationStore.selectedOrganization();
          if (!organization) return;
          const key: string = buildDashboardStorageKey(organization.id, 'asset-growth');
          writeDashboardStorage<PersistedAssetGrowthFilters>(key, {
            _v: DASHBOARD_PERSISTENCE_VERSION,
            granularity: store.selectedGranularity(),
            dateRange: serializeDateRange(store.selectedDateRange()),
            compareEnabled: store.compareEnabled(),
            equipmentType: store.selectedEquipmentType(),
            equipmentStatus: store.selectedEquipmentStatus(),
            facilityType: store.selectedFacilityType(),
          });
        });
      },
    };
  }),

  //#endregion
  );
}

export const AssetGrowthTrendStore: ReturnType<typeof createAssetGrowthTrendStore> =
  createAssetGrowthTrendStore();

/**
 * Type OrganizationDashboardAssetGrowthStore
 * @type AssetGrowthTrendStore
 *
 * @description
 * Instance type of the {@link AssetGrowthTrendStore}
 * signal store. Use this type for constructor-parameter and property
 * type annotations throughout the dashboard card component and its tests.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type AssetGrowthTrendStore = InstanceType<
  typeof AssetGrowthTrendStore
>;
