import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
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
import {
  alignDashboardTrendSeries,
  buildPercentageSeries,
  type AlignedDashboardTrendSeries,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import type {
  InspectionResult,
  InspectionStatus,
  InspectorType,
  NonConformitySeverity,
} from '@features/organization/features/inspections/models';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendResourceParams,
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
 * Type PersistedInspectionQualityFilters
 *
 * @description
 * Shape of the persisted inspection-quality filter payload stored in
 * `localStorage`. Extends the base dashboard filter fields with the four
 * dimension filters specific to this widget.
 *
 * @since 1.0.0
 */
type PersistedInspectionQualityFilters = PersistedDashboardBaseFilters & {
  readonly inspectionStatus: InspectionStatus | null;
  readonly inspectionResult: InspectionResult | null;
  readonly inspectorType: InspectorType | null;
  readonly nonConformitySeverity: NonConformitySeverity | null;
};

/**
 * Type OrganizationDashboardInspectionQualityData
 *
 * @description
 * Combined payload returned by the two parallel API calls
 * (inspections + NC opened). Stored in state after a successful load.
 *
 * @since 1.0.0
 */
type OrganizationDashboardInspectionQualityData = {
  readonly inspections: OrganizationDashboardTrendOutput;
  readonly ncOpened: OrganizationDashboardTrendOutput;
};

/**
 * Type OrganizationDashboardInspectionQualityParams
 *
 * @description
 * Parameters forwarded to both API calls on each load. Extends the base
 * trend resource params with all four dimension filters available on this card.
 *
 * @since 1.0.0
 */
type OrganizationDashboardInspectionQualityParams = OrganizationDashboardTrendResourceParams & {
  readonly inspectionStatus?: InspectionStatus;
  readonly inspectionResult?: InspectionResult;
  readonly inspectorType?: InspectorType;
  readonly nonConformitySeverity?: NonConformitySeverity;
};

/**
 * Store OrganizationDashboardInspectionQualityStore
 * @const OrganizationDashboardInspectionQualityStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Inspection Quality** dashboard
 * card. Fires two parallel API calls (inspections + NC opened) via `forkJoin`,
 * exposes four KPI metrics (Inspections, Opened NC, NC Rate, Rate Shift),
 * and builds a combo bar/line chart with a secondary NC-rate axis.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardInspectionQualityStore] })
 * export class OrganizationDashboardInspectionQualityTrend {
 *   protected readonly store = inject(OrganizationDashboardInspectionQualityStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
function createInspectionQualityTrendStore() {
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
    withQueryState<OrganizationDashboardInspectionQualityData>(),
    withDashboardFilterState(),
    withState(getDashboardInitialFilterDraftState()),
    withState({
      selectedInspectionStatus: null as InspectionStatus | null,
      selectedInspectionResult: null as InspectionResult | null,
      selectedInspectorType: null as InspectorType | null,
      selectedNonConformitySeverity: null as NonConformitySeverity | null,
      draftInspectionStatus: null as InspectionStatus | null,
      draftInspectionResult: null as InspectionResult | null,
      draftInspectorType: null as InspectorType | null,
      draftNonConformitySeverity: null as NonConformitySeverity | null,
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
      load: rxMethod<OrganizationDashboardInspectionQualityParams | undefined>(
        pipe(
          switchMap((params) => {
            if (!params) return EMPTY;

            patchState(store, setPendingQuery());

            return forkJoin({
              inspections: organizationService.getDashboardInspectionsTrend(params.organizationId, {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
                inspectionStatus: params.inspectionStatus,
                inspectionResult: params.inspectionResult,
                inspectorType: params.inspectorType,
              }),
              ncOpened: organizationService.getDashboardNonConformitiesOpenedTrend(
                params.organizationId,
                {
                  granularity: params.granularity,
                  from: params.from,
                  to: params.to,
                  compare: params.compare,
                  nonConformitySeverity: params.nonConformitySeverity,
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
       * Method setInspectionStatus
       *
       * @description
       * Updates the active inspection-status filter. Triggers a new fetch.
       *
       * @param {InspectionStatus | null} inspectionStatus - New status, or null to clear.
       * @returns {void}
       * @since 1.0.0
       */
      setInspectionStatus(inspectionStatus: InspectionStatus | null): void {
        patchState(store, { selectedInspectionStatus: inspectionStatus });
      },

      /**
       * Method setInspectionResult
       *
       * @description
       * Updates the active inspection-result filter. Triggers a new fetch.
       *
       * @param {InspectionResult | null} inspectionResult - New result, or null to clear.
       * @returns {void}
       * @since 1.0.0
       */
      setInspectionResult(inspectionResult: InspectionResult | null): void {
        patchState(store, { selectedInspectionResult: inspectionResult });
      },

      /**
       * Method setInspectorType
       *
       * @description
       * Updates the active inspector-type filter. Triggers a new fetch.
       *
       * @param {InspectorType | null} inspectorType - New inspector type, or null to clear.
       * @returns {void}
       * @since 1.0.0
       */
      setInspectorType(inspectorType: InspectorType | null): void {
        patchState(store, { selectedInspectorType: inspectorType });
      },

      /**
       * Method setNonConformitySeverity
       *
       * @description
       * Updates the active NC-severity filter. Triggers a new fetch.
       *
       * @param {NonConformitySeverity | null} nonConformitySeverity - New severity, or null to clear.
       * @returns {void}
       * @since 1.0.0
       */
      setNonConformitySeverity(nonConformitySeverity: NonConformitySeverity | null): void {
        patchState(store, { selectedNonConformitySeverity: nonConformitySeverity });
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
       * Method setDraftInspectionStatus
       *
       * @description
       * Updates the draft inspection-status value edited inside the filter drawer.
       *
       * @param {InspectionStatus | null} inspectionStatus - Draft inspection status.
       * @returns {void}
       */
      setDraftInspectionStatus(inspectionStatus: InspectionStatus | null): void {
        patchState(store, { draftInspectionStatus: inspectionStatus });
      },

      /**
       * Method setDraftInspectionResult
       *
       * @description
       * Updates the draft inspection-result value edited inside the filter drawer.
       *
       * @param {InspectionResult | null} inspectionResult - Draft inspection result.
       * @returns {void}
       */
      setDraftInspectionResult(inspectionResult: InspectionResult | null): void {
        patchState(store, { draftInspectionResult: inspectionResult });
      },

      /**
       * Method setDraftInspectorType
       *
       * @description
       * Updates the draft inspector-type value edited inside the filter drawer.
       *
       * @param {InspectorType | null} inspectorType - Draft inspector type.
       * @returns {void}
       */
      setDraftInspectorType(inspectorType: InspectorType | null): void {
        patchState(store, { draftInspectorType: inspectorType });
      },

      /**
       * Method setDraftNonConformitySeverity
       *
       * @description
       * Updates the draft NC-severity value edited inside the filter drawer.
       *
       * @param {NonConformitySeverity | null} nonConformitySeverity - Draft non-conformity severity.
       * @returns {void}
       */
      setDraftNonConformitySeverity(nonConformitySeverity: NonConformitySeverity | null): void {
        patchState(store, { draftNonConformitySeverity: nonConformitySeverity });
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
          draftInspectionStatus: store.selectedInspectionStatus(),
          draftInspectionResult: store.selectedInspectionResult(),
          draftInspectorType: store.selectedInspectorType(),
          draftNonConformitySeverity: store.selectedNonConformitySeverity(),
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
          draftInspectionStatus: store.selectedInspectionStatus(),
          draftInspectionResult: store.selectedInspectionResult(),
          draftInspectorType: store.selectedInspectorType(),
          draftNonConformitySeverity: store.selectedNonConformitySeverity(),
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
          draftInspectionStatus: null,
          draftInspectionResult: null,
          draftInspectorType: null,
          draftNonConformitySeverity: null,
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
          selectedInspectionStatus: store.draftInspectionStatus(),
          selectedInspectionResult: store.draftInspectionResult(),
          selectedInspectorType: store.draftInspectorType(),
          selectedNonConformitySeverity: store.draftNonConformitySeverity(),
        });
      },
    })),
    //#endregion

    //#region Computed

    /**
     * Feature withComputed (aligned series)
     *
     * @description
     * Aligns the raw inspection and NC-opened time series onto a shared bucket
     * axis once per state change. Both the chart component and the summary
     * metrics consumer read this memoised signal, so {@link alignDashboardTrendSeries}
     * is only ever called once per reactive cycle.
     *
     * @since 2.0.0
     */
    withComputed((store) => ({
      /**
       * Property alignedTrendData
       * @readonly
       *
       * @description
       * Shared aligned series used by the chart component (`data` computed)
       * and the parent component (`summaryMetrics` computed).  Recomputes
       * whenever `queryData` or `selectedGranularity` changes.
       *
       * @since 2.0.0
       *
       * @type {Signal<AlignedDashboardTrendSeries>}
       */
      alignedTrendData: computed<AlignedDashboardTrendSeries>(() => {
        const data: ReturnType<typeof store.queryData> = store.queryData();
        return alignDashboardTrendSeries(
          [data?.inspections?.series, data?.ncOpened?.series],
          store.selectedGranularity(),
        );
      }),
    })),

    /**
     * Feature withComputed (rate series)
     *
     * @description
     * Derives the per-bucket NC rate series from {@link alignedTrendData}.
     * Placed in a separate `withComputed` call so it can reference the
     * `alignedTrendData` signal already present on the store.
     *
     * @since 2.0.0
     */
    withComputed((store) => ({
      /**
       * Property rateSeriesData
       * @readonly
       *
       * @description
       * Per-bucket NC rate (0–100 %) derived from the aligned inspection and
       * NC-opened datasets. Used by the chart for the secondary line dataset
       * and by the parent component to compute the Rate Shift KPI tile.
       *
       * @since 2.0.0
       *
       * @type {Signal<readonly number[]>}
       */
      rateSeriesData: computed<readonly number[]>(() => {
        const [inspectionData = [], ncOpenedData = []]: AlignedDashboardTrendSeries['datasets'] =
          store.alignedTrendData().datasets;
        return buildPercentageSeries(ncOpenedData, inspectionData);
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
     * @since 1.0.0
     */
    withComputed((store) => {
      const platformId: object = inject(PLATFORM_ID);
      const activeOrganizationStore: ActiveOrganizationStore = inject(ActiveOrganizationStore);

      return {
        loadParams: computed<OrganizationDashboardInspectionQualityParams | undefined>(() => {
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
            inspectionStatus: store.selectedInspectionStatus() ?? undefined,
            inspectionResult: store.selectedInspectionResult() ?? undefined,
            inspectorType: store.selectedInspectorType() ?? undefined,
            nonConformitySeverity: store.selectedNonConformitySeverity() ?? undefined,
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
     * @since 1.0.0
     */
    withHooks((store) => {
      const platformId: object = inject(PLATFORM_ID);
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
          // Restore saved filters before wiring the reactive load so the first
          // API call uses the persisted filter values instead of the defaults.
          if (isPlatformBrowser(platformId)) {
            const organization: ReturnType<typeof activeOrganizationStore.selectedOrganization> =
              activeOrganizationStore.selectedOrganization();
            if (organization) {
              const key: string = buildDashboardStorageKey(organization.id, 'inspection-quality');
              const saved: PersistedInspectionQualityFilters | null =
                readDashboardStorage<PersistedInspectionQualityFilters>(key);
              if (saved) {
                patchState(store, {
                  selectedGranularity: saved.granularity,
                  compareEnabled: saved.compareEnabled,
                  selectedInspectionStatus: saved.inspectionStatus,
                  selectedInspectionResult: saved.inspectionResult,
                  selectedInspectorType: saved.inspectorType,
                  selectedNonConformitySeverity: saved.nonConformitySeverity,
                });
                // Restore date range via the setter to enforce maxRangeDays validation.
                store.setDateRange(deserializeDateRange(saved.dateRange));
              }
            }
          }

          // === Reactive load ===
          store.load(store.loadParams);

          // === Persistence: Write effect ===
          // Serializes all filter state to localStorage whenever any filter changes.
          effect(() => {
            if (!isPlatformBrowser(platformId)) return;
            const organization: ReturnType<typeof activeOrganizationStore.selectedOrganization> =
              activeOrganizationStore.selectedOrganization();
            if (!organization) return;
            const key: string = buildDashboardStorageKey(organization.id, 'inspection-quality');
            writeDashboardStorage<PersistedInspectionQualityFilters>(key, {
              _v: DASHBOARD_PERSISTENCE_VERSION,
              granularity: store.selectedGranularity(),
              dateRange: serializeDateRange(store.selectedDateRange()),
              compareEnabled: store.compareEnabled(),
              inspectionStatus: store.selectedInspectionStatus(),
              inspectionResult: store.selectedInspectionResult(),
              inspectorType: store.selectedInspectorType(),
              nonConformitySeverity: store.selectedNonConformitySeverity(),
            });
          });
        },
      };
    }),
    //#endregion
  );
}

export const InspectionQualityTrendStore: ReturnType<typeof createInspectionQualityTrendStore> =
  createInspectionQualityTrendStore();

/**
 * Type OrganizationDashboardInspectionQualityStore
 * @type InspectionQualityTrendStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type InspectionQualityTrendStore = InstanceType<typeof InspectionQualityTrendStore>;
