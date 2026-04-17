import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods } from '@ngrx/signals';
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
  OrganizationDashboardComparisonMetric,
  OrganizationDashboardComparisonMetricGroup,
  OrganizationDashboardOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Type OrganizationDashboardKpiValue
 *
 * @description
 * Primitive KPI value extracted from an overview section summary
 * entry. Covers the numeric and formatted-string cases returned by
 * the backend, plus null when the metric is absent.
 */
type OrganizationDashboardKpiValue = number | string | null;

/**
 * Type OrganizationDashboardComparisonDelta
 *
 * @description
 * Scalar delta entry shown below a KPI card when the
 * previous-period comparison is enabled.
 */
type OrganizationDashboardComparisonDelta = {
  readonly value: string | number | null;
  readonly direction: string | null;
};

/**
 * Store OrganizationDashboardStore
 * @const OrganizationDashboardStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the aggregate `/dashboard`
 * endpoint. Fetches KPI summary and comparison data for the active
 * organization and exposes derived signals for the four KPI cards
 * and their period-over-period comparison deltas.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardStore] })
 * export class OrganizationDashboard {
 *   protected readonly store = inject(OrganizationDashboardStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const DashboardStore = signalStore(
  //#region State

  /**
   * Feature withQueryState
   *
   * @description
   * Seeds the store with idle/pending/success/error status,
   * the raw dashboard payload and a normalized error.
   *
   * @since 1.0.0
   */
  withQueryState<OrganizationDashboardOutput>(),
  //#endregion

  //#region Computed

  /**
   * Feature withComputed
   *
   * @description
   * Derives the four KPI count values and four comparison deltas
   * from the raw `queryData` signal.
   *
   * @since 1.0.0
   */
  withComputed((store) => ({
    /**
     * Computed facilityCount
     *
     * @description
     * Total facility count from `overview.facilities.summary[0].value`.
     *
     * @since 1.0.0
     */
    facilityCount: computed<OrganizationDashboardKpiValue>(
      () => store.queryData()?.overview?.['facilities']?.['summary']?.[0]?.['value'] ?? null,
    ),

    /**
     * Computed memberCount
     *
     * @description
     * Total member count from `overview.members.summary[0].value`.
     *
     * @since 1.0.0
     */
    memberCount: computed<OrganizationDashboardKpiValue>(
      () => store.queryData()?.overview?.['members']?.['summary']?.[0]?.['value'] ?? null,
    ),

    /**
     * Computed equipmentCount
     *
     * @description
     * Total equipment count from `overview.equipment.summary[0].value`.
     *
     * @since 1.0.0
     */
    equipmentCount: computed<OrganizationDashboardKpiValue>(
      () => store.queryData()?.overview?.['equipment']?.['summary']?.[0]?.['value'] ?? null,
    ),

    /**
     * Computed inspectionCount
     *
     * @description
     * Total inspection count from `overview.inspections.summary[0].value`.
     *
     * @since 1.0.0
     */
    inspectionCount: computed<OrganizationDashboardKpiValue>(
      () => store.queryData()?.overview?.['inspections']?.['summary']?.[0]?.['value'] ?? null,
    ),

    /**
     * Computed facilitiesComparison
     *
     * @description
     * Period-over-period delta for the facilities KPI.
     *
     * @since 1.0.0
     */
    facilitiesComparison: computed<OrganizationDashboardComparisonDelta | null>(() => {
      const metrics: OrganizationDashboardComparisonMetricGroup | undefined =
        store.queryData()?.comparison?.metrics;
      const entry: OrganizationDashboardComparisonMetric | undefined = metrics?.find(
        (m: OrganizationDashboardComparisonMetric) => m['key'] === 'facilities',
      );
      if (!entry) return null;
      return {
        value: entry['value'],
        direction: entry['direction'] != null ? String(entry['direction']) : null,
      };
    }),

    /**
     * Computed membersComparison
     *
     * @description
     * Period-over-period delta for the members KPI.
     *
     * @since 1.0.0
     */
    membersComparison: computed<OrganizationDashboardComparisonDelta | null>(() => {
      const metrics: OrganizationDashboardComparisonMetricGroup | undefined =
        store.queryData()?.comparison?.metrics;
      const entry: OrganizationDashboardComparisonMetric | undefined = metrics?.find(
        (m: OrganizationDashboardComparisonMetric) => m['key'] === 'members',
      );
      if (!entry) return null;
      return {
        value: entry['value'],
        direction: entry['direction'] != null ? String(entry['direction']) : null,
      };
    }),

    /**
     * Computed equipmentComparison
     *
     * @description
     * Period-over-period delta for the equipment KPI.
     *
     * @since 1.0.0
     */
    equipmentComparison: computed<OrganizationDashboardComparisonDelta | null>(() => {
      const metrics: OrganizationDashboardComparisonMetricGroup | undefined =
        store.queryData()?.comparison?.metrics;
      const entry: OrganizationDashboardComparisonMetric | undefined = metrics?.find(
        (m: OrganizationDashboardComparisonMetric) => m['key'] === 'equipment',
      );
      if (!entry) return null;
      return {
        value: entry['value'],
        direction: entry['direction'] != null ? String(entry['direction']) : null,
      };
    }),

    /**
     * Computed inspectionsComparison
     *
     * @description
     * Period-over-period delta for the inspections KPI.
     *
     * @since 1.0.0
     */
    inspectionsComparison: computed<OrganizationDashboardComparisonDelta | null>(() => {
      const metrics: OrganizationDashboardComparisonMetricGroup | undefined =
        store.queryData()?.comparison?.metrics;
      const entry: OrganizationDashboardComparisonMetric | undefined = metrics?.find(
        (m: OrganizationDashboardComparisonMetric) => m['key'] === 'inspections',
      );
      if (!entry) return null;
      return {
        value: entry['value'],
        direction: entry['direction'] != null ? String(entry['direction']) : null,
      };
    }),
  })),
  //#endregion

  //#region Methods

  /**
   * Feature withMethods
   *
   * @description
   * Adds the `load` reactive method that fetches the aggregate
   * `/dashboard` payload for the given organization ID.
   *
   * @since 1.0.0
   */
  withMethods((store, organizationService = inject(OrganizationService)) => ({
    /**
     * Method load
     *
     * @description
     * NgRx `rxMethod` that fetches the dashboard KPI payload
     * whenever the organization ID signal emits a new value.
     * Undefined params are silently ignored via an `EMPTY` return.
     *
     * @since 1.0.0
     */
    load: rxMethod<string | undefined>(
      pipe(
        switchMap((organizationId) => {
          if (!organizationId) return EMPTY;

          patchState(store, setPendingQuery());

          const now: Date = new Date();
          const to: string = now.toISOString();
          const from: string = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

          return organizationService.getDashboard(organizationId, { from, to }).pipe(
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

  //#region Hooks

  /**
   * Feature withComputed (load params)
   *
   * @description
   * Derives the organization ID forwarded to {@link load}. Declared in
   * `withComputed` so that derived state is not created imperatively
   * inside `onInit`.
   *
   * @since 1.0.0
   */
  withComputed((store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject(ActiveOrganizationStore);

    return {
      loadParams: computed<string | undefined>(() => {
        if (!isPlatformBrowser(platformId)) return undefined;
        return activeOrganizationStore.selectedOrganization()?.id ?? undefined;
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
  withHooks({
    onInit(store) {
      store.load(store.loadParams);
    },
  }),
  //#endregion
);

/**
 * Type OrganizationDashboardStore
 * @type DashboardStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type DashboardStore = InstanceType<typeof DashboardStore>;

