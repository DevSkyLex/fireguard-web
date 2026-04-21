import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
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
 * Type PersistedFacilitiesCreatedFilters
 *
 * @description
 * Shape of the persisted facilities-created filter payload stored in
 * `localStorage`. Extends the base dashboard filter fields with the
 * dimension filter specific to this widget.
 *
 * @since 1.0.0
 */
type PersistedFacilitiesCreatedFilters = PersistedDashboardBaseFilters & {
  readonly facilityType: FacilityType | null;
};

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
function createFacilitiesCreatedTrendStore() {
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
   * @since 1.0.0
   */
  withQueryState<OrganizationDashboardTrendOutput>(),
  withDashboardFilterState(),
  withState(getDashboardInitialFilterDraftState()),
  withState({
    selectedFacilityType: null as FacilityType | null,
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
        selectedFacilityType: store.draftFacilityType(),
      });
    },
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
   * @since 1.0.0
   */
  withComputed((store) => {
    const platformId: Object = inject(PLATFORM_ID);
    const activeOrganizationStore: ActiveOrganizationStore = inject(ActiveOrganizationStore);

    return {
      loadParams: computed<OrganizationDashboardFacilityTrendResourceParams | undefined>(
        () => {
          if (!isPlatformBrowser(platformId)) return undefined;

          const organization: ReturnType<typeof activeOrganizationStore.selectedOrganization> =
            activeOrganizationStore.selectedOrganization();
          if (!organization) return undefined;

          const baseParams: ReturnType<typeof buildDashboardTrendBaseParams> =
            buildDashboardTrendBaseParams(store);
          if (!baseParams) return undefined;

          return {
            organizationId: organization.id,
            ...baseParams,
            facilityType: store.selectedFacilityType() ?? undefined,
          };
        },
      ),
    };
  }),

  /**
   * Feature withHooks
   *
   * @description
   * Wires up the reactive data-fetching effect on store init.
   *
   * @since 1.0.0
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
       */
      onInit(): void {
        // === Persistence: Hydration ===
        if (isPlatformBrowser(platformId)) {
          const organization: ReturnType<typeof activeOrganizationStore.selectedOrganization> =
            activeOrganizationStore.selectedOrganization();
          if (organization) {
            const key: string = buildDashboardStorageKey(organization.id, 'facilities-created');
            const saved: PersistedFacilitiesCreatedFilters | null =
              readDashboardStorage<PersistedFacilitiesCreatedFilters>(key);
            if (saved) {
              patchState(store, {
                selectedGranularity: saved.granularity,
                compareEnabled: saved.compareEnabled,
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
          const key: string = buildDashboardStorageKey(organization.id, 'facilities-created');
          writeDashboardStorage<PersistedFacilitiesCreatedFilters>(key, {
            _v: DASHBOARD_PERSISTENCE_VERSION,
            granularity: store.selectedGranularity(),
            dateRange: serializeDateRange(store.selectedDateRange()),
            compareEnabled: store.compareEnabled(),
            facilityType: store.selectedFacilityType(),
          });
        });
      },
    };
  }),
  //#endregion
  );
}

export const FacilitiesCreatedTrendStore: ReturnType<typeof createFacilitiesCreatedTrendStore> =
  createFacilitiesCreatedTrendStore();

/**
 * Type OrganizationDashboardFacilitiesCreatedStore
 * @type FacilitiesCreatedTrendStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type FacilitiesCreatedTrendStore = InstanceType<
  typeof FacilitiesCreatedTrendStore
>;

