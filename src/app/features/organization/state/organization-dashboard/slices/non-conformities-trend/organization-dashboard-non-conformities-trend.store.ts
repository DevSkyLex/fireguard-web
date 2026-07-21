import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
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
} from '@core/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationDashboardTrendOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Constant NON_CONFORMITIES_TREND_WEEKS
 * @const NON_CONFORMITIES_TREND_WEEKS
 *
 * @description
 * Fixed window of the merged non-conformities card: the prototype pins
 * it to the last eight weeks, one bucket per week.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const NON_CONFORMITIES_TREND_WEEKS: number = 8;

/**
 * Type NonConformitiesTrendResource
 *
 * @description
 * Combined payload of the merged non-conformities card: the opened and
 * resolved trend resources loaded in one parallel `forkJoin`.
 */
export type NonConformitiesTrendResource = {
  readonly opened: OrganizationDashboardTrendOutput;
  readonly resolved: OrganizationDashboardTrendOutput;
};

/**
 * Type NonConformitiesTrendResourceParams
 *
 * @description
 * Reactive params of the merged non-conformities card query: the active
 * organization plus the fixed eight-week ISO window.
 */
export type NonConformitiesTrendResourceParams = {
  readonly organizationId: string;
  readonly from: string;
  readonly to: string;
};

/**
 * Store NonConformitiesTrendStore
 * @const NonConformitiesTrendStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the merged **Opened vs resolved**
 * non-conformities dashboard card. Fires the opened and resolved trend
 * queries in parallel over a fixed last-8-weeks weekly window and exposes
 * both payloads as one query state.
 *
 * @example
 * ```typescript
 * @Component({ providers: [NonConformitiesTrendStore] })
 * export class NonConformitiesTrend {
 *   protected readonly store = inject<NonConformitiesTrendStore>(NonConformitiesTrendStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
function createNonConformitiesTrendStore() {
  return signalStore(
    //#region State

    /**
     * Feature withQueryState
     *
     * @description
     * Seeds the store with idle/pending/success/error status, the combined
     * opened/resolved payload and a normalized error.
     *
     * @since 1.0.0
     */
    withQueryState<NonConformitiesTrendResource>(),
    //#endregion

    //#region Methods

    /**
     * Feature withMethods
     *
     * @description
     * Adds the `load` reactive method firing both trend queries in one
     * `forkJoin` so the card renders atomically.
     *
     * @since 1.0.0
     */
    withMethods(
      (store, organizationService = inject<OrganizationService>(OrganizationService)) => ({
        /**
         * Method load
         *
         * @description
         * NgRx `rxMethod` that fetches the opened and resolved trend datasets
         * in parallel whenever the params signal emits. Undefined params are
         * silently ignored via an `EMPTY` return. Comparison is disabled: the
         * card compares the two live series against each other, not against a
         * previous period.
         *
         * @since 1.0.0
         */
        load: rxMethod<NonConformitiesTrendResourceParams | undefined>(
          pipe(
            switchMap((params) => {
              if (!params) return EMPTY;

              patchState(store, setPendingQuery());

              const options = {
                granularity: 'week',
                from: params.from,
                to: params.to,
                compare: false,
              } as const;

              return forkJoin({
                opened: organizationService.getDashboardNonConformitiesOpenedTrend(
                  params.organizationId,
                  options,
                ),
                resolved: organizationService.getDashboardNonConformitiesResolvedTrend(
                  params.organizationId,
                  options,
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
      }),
    ),
    //#endregion

    //#region Hooks

    /**
     * Feature withComputed (load params)
     *
     * @description
     * Derives the query params from the active organization and the fixed
     * eight-week window. Declared in `withComputed` so derived state is not
     * created imperatively inside `onInit`.
     *
     * @since 1.0.0
     */
    withComputed((_store) => {
      const platformId: object = inject(PLATFORM_ID);
      const activeOrganizationStore: ActiveOrganizationStore =
        inject<ActiveOrganizationStore>(ActiveOrganizationStore);

      return {
        loadParams: computed<NonConformitiesTrendResourceParams | undefined>(() => {
          if (!isPlatformBrowser(platformId)) return undefined;

          const organization = activeOrganizationStore.selectedOrganization();
          if (!organization) return undefined;

          const to: Date = new Date();
          const from: Date = new Date(
            to.getTime() - NON_CONFORMITIES_TREND_WEEKS * 7 * 24 * 60 * 60 * 1000,
          );

          return {
            organizationId: organization.id,
            from: from.toISOString(),
            to: to.toISOString(),
          };
        }),
      };
    }),

    /**
     * Feature withHooks
     *
     * @description
     * Connects {@link loadParams} to {@link load} on store init.
     *
     * @since 1.0.0
     */
    withHooks((store) => ({
      onInit(): void {
        store.load(store.loadParams);
      },
    })),
    //#endregion
  );
}

export const NonConformitiesTrendStore: ReturnType<typeof createNonConformitiesTrendStore> =
  createNonConformitiesTrendStore();

/**
 * Type NonConformitiesTrendStoreType
 * @type NonConformitiesTrendStoreType
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type NonConformitiesTrendStoreType = InstanceType<typeof NonConformitiesTrendStore>;
