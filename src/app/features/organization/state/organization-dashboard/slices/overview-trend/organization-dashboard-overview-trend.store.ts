import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods } from '@ngrx/signals';
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
import type {
  OrganizationDashboardOverviewTrendResource,
  OrganizationDashboardTrendResourceParams,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  alignDashboardTrendSeries,
  type AlignedDashboardTrendSeries,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
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
 * Store OrganizationDashboardOverviewTrendStore
 * @const OrganizationDashboardOverviewTrendStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Overview Trend** dashboard
 * card. Fires three parallel API calls (inspections, NC opened, NC resolved)
 * using `forkJoin`, then exposes a four-dataset line chart (including the
 * derived Net Pressure series) and four KPI metrics.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardOverviewTrendStore] })
 * export class OrganizationDashboardOverviewTrend {
 *   protected readonly store = inject(OrganizationDashboardOverviewTrendStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OverviewTrendStore = signalStore(
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
  withQueryState<OrganizationDashboardOverviewTrendResource>(),
  withDashboardFilterState(),
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
     * NgRx `rxMethod` that fetches three parallel trend datasets (inspections,
     * NC opened, NC resolved) via `forkJoin` whenever the params signal emits.
     * Undefined params are silently ignored via an `EMPTY` return.
     *
     * @since 1.0.0
     */
    load: rxMethod<OrganizationDashboardTrendResourceParams | undefined>(
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
            }),
            ncOpened: organizationService.getDashboardNonConformitiesOpenedTrend(
              params.organizationId,
              {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
              },
            ),
            ncResolved: organizationService.getDashboardNonConformitiesResolvedTrend(
              params.organizationId,
              {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
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
  })),
  //#endregion

  //#region Computed

  /**
   * Feature withComputed
   *
   * @description
   * Derives the aligned trend series shared by chart and summary metrics.
   *
   * @since 1.0.0
   */
  withComputed((store) => ({
    alignedTrendData: computed<AlignedDashboardTrendSeries>(() => {
      const result = store.queryData();
      return alignDashboardTrendSeries(
        [result?.inspections?.series, result?.ncOpened?.series, result?.ncResolved?.series],
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
   * @since 1.0.0
   */
  withComputed((store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject(ActiveOrganizationStore);

    return {
      loadParams: computed<OrganizationDashboardTrendResourceParams | undefined>(() => {
        if (!isPlatformBrowser(platformId)) return undefined;

        const organization = activeOrganizationStore.selectedOrganization();
        if (!organization) return undefined;

        const baseParams = buildDashboardTrendBaseParams(store);
        if (!baseParams) return undefined;

        return { organizationId: organization.id, ...baseParams };
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
            const key = buildDashboardStorageKey(organization.id, 'overview');
            const saved = readDashboardStorage<PersistedDashboardBaseFilters>(key);
            if (saved) {
              patchState(store, {
                selectedGranularity: saved.granularity,
                compareEnabled: saved.compareEnabled,
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
          const key = buildDashboardStorageKey(organization.id, 'overview');
          writeDashboardStorage<PersistedDashboardBaseFilters>(key, {
            _v: DASHBOARD_PERSISTENCE_VERSION,
            granularity: store.selectedGranularity(),
            dateRange: serializeDateRange(store.selectedDateRange()),
            compareEnabled: store.compareEnabled(),
          });
        });
      },
    };
  }),
  //#endregion
);

/**
 * Type OrganizationDashboardOverviewTrendStore
 * @type OverviewTrendStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OverviewTrendStore = InstanceType<
  typeof OverviewTrendStore
>;

