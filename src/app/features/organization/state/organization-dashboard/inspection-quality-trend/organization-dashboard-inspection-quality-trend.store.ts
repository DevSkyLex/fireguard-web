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
  withDashboardFilterState,
} from '../organization-dashboard-filter.feature';

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
export const OrganizationDashboardInspectionQualityStore = signalStore(
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
  withState({
    selectedInspectionStatus: null as InspectionStatus | null,
    selectedInspectionResult: null as InspectionResult | null,
    selectedInspectorType: null as InspectorType | null,
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
        const params = computed<OrganizationDashboardInspectionQualityParams | undefined>(() => {
          if (!isPlatformBrowser(platformId)) return undefined;

          const organization = activeOrganizationStore.selectedOrganization();
          if (!organization) return undefined;

          const baseParams = buildDashboardTrendBaseParams(store);
          if (!baseParams) return undefined;

          return {
            organizationId: organization.id,
            ...baseParams,
            inspectionStatus: store.selectedInspectionStatus() ?? undefined,
            inspectionResult: store.selectedInspectionResult() ?? undefined,
            inspectorType: store.selectedInspectorType() ?? undefined,
            nonConformitySeverity: store.selectedNonConformitySeverity() ?? undefined,
          };
        });

        store.load(params);
      },
    };
  }),
  //#endregion
);

/**
 * Type OrganizationDashboardInspectionQualityStore
 * @type OrganizationDashboardInspectionQualityStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationDashboardInspectionQualityStore = InstanceType<
  typeof OrganizationDashboardInspectionQualityStore
>;
