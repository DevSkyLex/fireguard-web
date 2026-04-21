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
  NonConformitySeverity,
  NonConformityStatus,
} from '@features/organization/features/inspections/models';
import type {
  OrganizationDashboardNonConformityTrendResourceParams,
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
 * Type PersistedNonConformitiesResolvedFilters
 *
 * @description
 * Shape of the persisted non-conformities-resolved filter payload stored in
 * `localStorage`. Extends the base dashboard filter fields with the two
 * dimension filters specific to this widget.
 *
 * @since 1.0.0
 */
type PersistedNonConformitiesResolvedFilters = PersistedDashboardBaseFilters & {
  readonly nonConformityStatus: NonConformityStatus | null;
  readonly nonConformitySeverity: NonConformitySeverity | null;
};

/**
 * Store OrganizationDashboardNonConformitiesResolvedStore
 * @const OrganizationDashboardNonConformitiesResolvedStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Resolved Non-Conformities**
 * dashboard trend card. Mirrors the opened-NC store structure but targets
 * the `getDashboardNonConformitiesResolvedTrend` endpoint instead.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardNonConformitiesResolvedStore] })
 * export class OrganizationDashboardNonConformitiesResolvedTrend {
 *   protected readonly store = inject(OrganizationDashboardNonConformitiesResolvedStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
function createNonConformitiesResolvedTrendStore() {
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
    selectedNonConformityStatus: null as NonConformityStatus | null,
    selectedNonConformitySeverity: null as NonConformitySeverity | null,
    draftNonConformityStatus: null as NonConformityStatus | null,
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
    /**
     * Method load
     *
     * @description
     * NgRx `rxMethod` that fetches the non-conformities-resolved trend dataset
     * whenever the params signal emits a new value.
     * Undefined params are silently ignored via an `EMPTY` return.
     *
     * @since 1.0.0
     */
    load: rxMethod<OrganizationDashboardNonConformityTrendResourceParams | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;

          patchState(store, setPendingQuery());

          return organizationService
            .getDashboardNonConformitiesResolvedTrend(params.organizationId, {
              granularity: params.granularity,
              from: params.from,
              to: params.to,
              compare: params.compare,
              nonConformityStatus: params.nonConformityStatus,
              nonConformitySeverity: params.nonConformitySeverity,
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
     * Method setNonConformityStatus
     *
     * @description
     * Updates the active NC-status filter. Triggers a new fetch.
     *
     * @param {NonConformityStatus | null} nonConformityStatus - New status, or null to clear.
     * @returns {void}
     * @since 1.0.0
     */
    setNonConformityStatus(nonConformityStatus: NonConformityStatus | null): void {
      patchState(store, { selectedNonConformityStatus: nonConformityStatus });
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
     * Method setDraftNonConformityStatus
     *
     * @description
     * Updates the draft NC-status value edited inside the filter drawer.
     *
     * @param {NonConformityStatus | null} nonConformityStatus - Draft non-conformity status.
     * @returns {void}
     */
    setDraftNonConformityStatus(nonConformityStatus: NonConformityStatus | null): void {
      patchState(store, { draftNonConformityStatus: nonConformityStatus });
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
    setDraftNonConformitySeverity(
      nonConformitySeverity: NonConformitySeverity | null,
    ): void {
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
        draftNonConformityStatus: store.selectedNonConformityStatus(),
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
        draftNonConformityStatus: store.selectedNonConformityStatus(),
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
        draftNonConformityStatus: null,
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
        selectedNonConformityStatus: store.draftNonConformityStatus(),
        selectedNonConformitySeverity: store.draftNonConformitySeverity(),
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
      loadParams: computed<OrganizationDashboardNonConformityTrendResourceParams | undefined>(
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
            nonConformityStatus: store.selectedNonConformityStatus() ?? undefined,
            nonConformitySeverity: store.selectedNonConformitySeverity() ?? undefined,
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
            const key: string = buildDashboardStorageKey(organization.id, 'non-conformities-resolved');
            const saved: PersistedNonConformitiesResolvedFilters | null =
              readDashboardStorage<PersistedNonConformitiesResolvedFilters>(key);
            if (saved) {
              patchState(store, {
                selectedGranularity: saved.granularity,
                compareEnabled: saved.compareEnabled,
                selectedNonConformityStatus: saved.nonConformityStatus,
                selectedNonConformitySeverity: saved.nonConformitySeverity,
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
          const key: string = buildDashboardStorageKey(organization.id, 'non-conformities-resolved');
          writeDashboardStorage<PersistedNonConformitiesResolvedFilters>(key, {
            _v: DASHBOARD_PERSISTENCE_VERSION,
            granularity: store.selectedGranularity(),
            dateRange: serializeDateRange(store.selectedDateRange()),
            compareEnabled: store.compareEnabled(),
            nonConformityStatus: store.selectedNonConformityStatus(),
            nonConformitySeverity: store.selectedNonConformitySeverity(),
          });
        });
      },
    };
  }),
  //#endregion
  );
}

export const NonConformitiesResolvedTrendStore: ReturnType<typeof createNonConformitiesResolvedTrendStore> =
  createNonConformitiesResolvedTrendStore();

/**
 * Type OrganizationDashboardNonConformitiesResolvedStore
 * @type NonConformitiesResolvedTrendStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type NonConformitiesResolvedTrendStore = InstanceType<
  typeof NonConformitiesResolvedTrendStore
>;

