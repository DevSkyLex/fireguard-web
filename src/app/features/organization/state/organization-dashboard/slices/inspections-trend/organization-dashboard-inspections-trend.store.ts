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
import type {
  InspectionResult,
  InspectionStatus,
  InspectorType,
} from '@features/organization/features/inspections/models';
import type {
  OrganizationDashboardInspectionTrendResourceParams,
  OrganizationDashboardTrendOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  buildDashboardTrendBaseParams,
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
 * Type PersistedInspectionsTrendFilters
 *
 * @description
 * Shape of the persisted inspections-trend filter payload stored in
 * `localStorage`. Extends the base dashboard filter fields with the three
 * dimension filters specific to this widget.
 *
 * @since 1.0.0
 */
type PersistedInspectionsTrendFilters = PersistedDashboardBaseFilters & {
  readonly inspectionStatus: InspectionStatus | null;
  readonly inspectionResult: InspectionResult | null;
  readonly inspectorType: InspectorType | null;
};

/**
 * Store OrganizationDashboardInspectionsTrendStore
 * @const OrganizationDashboardInspectionsTrendStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Inspections Trend**
 * dashboard card. Manages inspection-status, result, and inspector-type
 * filter state, fires the `getDashboardInspectionsTrend` API call reactively,
 * and exposes fully derived chart data (dynamic color gradient) and summary metrics.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardInspectionsTrendStore] })
 * export class OrganizationDashboardInspectionsTrend {
 *   protected readonly store = inject(OrganizationDashboardInspectionsTrendStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
function createInspectionsTrendStore() {
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
  withState({
    selectedInspectionStatus: null as InspectionStatus | null,
    selectedInspectionResult: null as InspectionResult | null,
    selectedInspectorType: null as InspectorType | null,
  }),
  //#endregion

  //#region Methods
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
     * NgRx `rxMethod` that fetches the inspections trend dataset
     * whenever the params signal emits a new value.
     * Undefined params are silently ignored via an `EMPTY` return.
     *
     * @since 1.0.0
     */
    load: rxMethod<OrganizationDashboardInspectionTrendResourceParams | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;

          patchState(store, setPendingQuery());

          return organizationService
            .getDashboardInspectionsTrend(params.organizationId, {
              granularity: params.granularity,
              from: params.from,
              to: params.to,
              compare: params.compare,
              inspectionStatus: params.inspectionStatus,
              inspectionResult: params.inspectionResult,
              inspectorType: params.inspectorType,
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
      loadParams: computed<OrganizationDashboardInspectionTrendResourceParams | undefined>(
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
            inspectionStatus: store.selectedInspectionStatus() ?? undefined,
            inspectionResult: store.selectedInspectionResult() ?? undefined,
            inspectorType: store.selectedInspectorType() ?? undefined,
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
            const key: string = buildDashboardStorageKey(organization.id, 'inspections');
            const saved: PersistedInspectionsTrendFilters | null =
              readDashboardStorage<PersistedInspectionsTrendFilters>(key);
            if (saved) {
              patchState(store, {
                selectedGranularity: saved.granularity,
                compareEnabled: saved.compareEnabled,
                selectedInspectionStatus: saved.inspectionStatus,
                selectedInspectionResult: saved.inspectionResult,
                selectedInspectorType: saved.inspectorType,
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
          const key: string = buildDashboardStorageKey(organization.id, 'inspections');
          writeDashboardStorage<PersistedInspectionsTrendFilters>(key, {
            _v: DASHBOARD_PERSISTENCE_VERSION,
            granularity: store.selectedGranularity(),
            dateRange: serializeDateRange(store.selectedDateRange()),
            compareEnabled: store.compareEnabled(),
            inspectionStatus: store.selectedInspectionStatus(),
            inspectionResult: store.selectedInspectionResult(),
            inspectorType: store.selectedInspectorType(),
          });
        });
      },
    };
  }),
  //#endregion
  );
}

export const InspectionsTrendStore: ReturnType<typeof createInspectionsTrendStore> =
  createInspectionsTrendStore();

/**
 * Type OrganizationDashboardInspectionsTrendStore
 * @type InspectionsTrendStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type InspectionsTrendStore = InstanceType<
  typeof InspectionsTrendStore
>;

