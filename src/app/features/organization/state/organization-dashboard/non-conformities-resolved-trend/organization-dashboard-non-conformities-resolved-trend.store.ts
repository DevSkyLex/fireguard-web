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
} from '../organization-dashboard-filter.feature';

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
export const OrganizationDashboardNonConformitiesResolvedStore = signalStore(
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
        const params = computed<OrganizationDashboardNonConformityTrendResourceParams | undefined>(
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
        );

        store.load(params);
      },
    };
  }),
  //#endregion
);

/**
 * Type OrganizationDashboardNonConformitiesResolvedStore
 * @type OrganizationDashboardNonConformitiesResolvedStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationDashboardNonConformitiesResolvedStore = InstanceType<
  typeof OrganizationDashboardNonConformitiesResolvedStore
>;
