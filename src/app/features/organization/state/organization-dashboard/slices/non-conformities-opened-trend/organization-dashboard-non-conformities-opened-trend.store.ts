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
  withDashboardFilterState,
} from '../../features/organization-dashboard-filter.feature';
import {
  DASHBOARD_PERSISTENCE_VERSION,
  type PersistedDashboardBaseFilters,
  buildDashboardStorageKey,
  deserializeDateRange,
  readDashboardStorage,
  serializeDateRange,
  writeDashboardStorage,
} from '../../utils/organization-dashboard-persistence.utils';

/**
 * Type PersistedNonConformitiesOpenedFilters
 *
 * @description
 * Shape of the persisted non-conformities-opened filter payload stored in
 * `localStorage`. Extends the base dashboard filter fields with the two
 * dimension filters specific to this widget.
 *
 * @since 1.0.0
 */
type PersistedNonConformitiesOpenedFilters = PersistedDashboardBaseFilters & {
  readonly nonConformityStatus: NonConformityStatus | null;
  readonly nonConformitySeverity: NonConformitySeverity | null;
};

/**
 * Store OrganizationDashboardNonConformitiesOpenedStore
 * @const OrganizationDashboardNonConformitiesOpenedStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Opened Non-Conformities**
 * dashboard trend card. Manages NC-status and NC-severity filter state,
 * fires the `getDashboardNonConformitiesOpenedTrend` API call reactively,
 * and exposes fully derived chart data and summary metrics.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardNonConformitiesOpenedStore] })
 * export class OrganizationDashboardNonConformitiesOpenedTrend {
 *   protected readonly store = inject(OrganizationDashboardNonConformitiesOpenedStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const NonConformitiesOpenedTrendStore = signalStore(
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
    selectedNonConformityStatus: null as NonConformityStatus | null,
    selectedNonConformitySeverity: null as NonConformitySeverity | null,
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
     * NgRx `rxMethod` that fetches the non-conformities-opened trend dataset
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
            .getDashboardNonConformitiesOpenedTrend(params.organizationId, {
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
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject(ActiveOrganizationStore);

    return {
      loadParams: computed<OrganizationDashboardNonConformityTrendResourceParams | undefined>(
        () => {
          if (!isPlatformBrowser(platformId)) return undefined;

          const organization = activeOrganizationStore.selectedOrganization();
          if (!organization) return undefined;

          const baseParams = buildDashboardTrendBaseParams(store);
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
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject(ActiveOrganizationStore);

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
          const organization = activeOrganizationStore.selectedOrganization();
          if (organization) {
            const key = buildDashboardStorageKey(organization.id, 'non-conformities-opened');
            const saved = readDashboardStorage<PersistedNonConformitiesOpenedFilters>(key);
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
          const organization = activeOrganizationStore.selectedOrganization();
          if (!organization) return;
          const key = buildDashboardStorageKey(organization.id, 'non-conformities-opened');
          writeDashboardStorage<PersistedNonConformitiesOpenedFilters>(key, {
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

/**
 * Type OrganizationDashboardNonConformitiesOpenedStore
 * @type NonConformitiesOpenedTrendStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type NonConformitiesOpenedTrendStore = InstanceType<
  typeof NonConformitiesOpenedTrendStore
>;

