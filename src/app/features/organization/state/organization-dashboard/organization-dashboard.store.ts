import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID, untracked } from '@angular/core';
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
import { EMPTY, filter, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  resetQuery,
  toStoreError,
} from '@core/request-state';
import { OrganizationService } from '@features/organization/data-access';
import { getDashboardTrendPointValue } from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import type {
  OrganizationDashboardAlert,
  OrganizationDashboardComparisonMetric,
  OrganizationDashboardComparisonMetricGroup,
  OrganizationDashboardOutput,
  OrganizationDashboardRecentIntervention,
  OrganizationDashboardTrends,
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
 * Function extractSparkline
 *
 * @description
 * Maps one embedded trend series to the plain numeric points consumed
 * by the KPI sparklines, or null when the series is absent or empty.
 *
 * @param {OrganizationDashboardTrends | undefined} trends - Embedded trends map from the dashboard payload.
 * @param {string} key - Backend-defined series key (e.g. `facilities`).
 * @returns {readonly number[] | null} Ordered numeric points, or null.
 */
function extractSparkline(
  trends: OrganizationDashboardTrends | undefined,
  key: string,
): readonly number[] | null {
  const points = trends?.[key];
  if (!points?.length) return null;
  const values: number[] = points
    .map(getDashboardTrendPointValue)
    .filter((value): value is number => value !== null);
  return values.length > 0 ? values : null;
}

/**
 * Store OrganizationDashboardStore
 * @const OrganizationDashboardStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the aggregate `/dashboard`
 * endpoint. Fetches KPI summary and comparison data for the active
 * organization and exposes derived signals for the four KPI cards
 * and their period-over-period comparison deltas. Query state belongs to
 * `queryOrganizationId`; changing that identity clears data and errors.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardStore] })
 * export class OrganizationDashboard {
 *   protected readonly store = inject<OrganizationDashboardStore>(OrganizationDashboardStore);
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
  withState({ queryOrganizationId: null as string | null }),
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

    /**
     * Computed facilitiesSparkline
     *
     * @description
     * Daily running-total points for the facilities KPI sparkline,
     * from the embedded `trends.facilities` series.
     *
     * @since 1.1.0
     */
    facilitiesSparkline: computed<readonly number[] | null>(() =>
      extractSparkline(store.queryData()?.trends, 'facilities'),
    ),

    /**
     * Computed membersSparkline
     *
     * @description
     * Daily running-total points for the members KPI sparkline,
     * from the embedded `trends.members` series.
     *
     * @since 1.1.0
     */
    membersSparkline: computed<readonly number[] | null>(() =>
      extractSparkline(store.queryData()?.trends, 'members'),
    ),

    /**
     * Computed equipmentSparkline
     *
     * @description
     * Daily running-total points for the equipment KPI sparkline,
     * from the embedded `trends.equipment` series.
     *
     * @since 1.1.0
     */
    equipmentSparkline: computed<readonly number[] | null>(() =>
      extractSparkline(store.queryData()?.trends, 'equipment'),
    ),

    /**
     * Computed inspectionsSparkline
     *
     * @description
     * Daily running-total points for the inspections KPI sparkline,
     * from the embedded `trends.inspections` series.
     *
     * @since 1.1.0
     */
    inspectionsSparkline: computed<readonly number[] | null>(() =>
      extractSparkline(store.queryData()?.trends, 'inspections'),
    ),

    /**
     * Computed recentInterventions
     *
     * @description
     * Most recently updated interventions embedded in the dashboard
     * payload. Empty until loaded or when the caller lacks the
     * interventions read permission.
     *
     * @since 1.1.0
     */
    recentInterventions: computed<readonly OrganizationDashboardRecentIntervention[]>(
      () => store.queryData()?.recentInterventions ?? [],
    ),

    /**
     * Computed alerts
     *
     * @description
     * Backend-computed attention feed embedded in the dashboard payload.
     * The API emits an entry only when its count is above zero, so the
     * list is already filtered: an empty array means nothing is raised.
     *
     * @since 1.2.0
     */
    alerts: computed<readonly OrganizationDashboardAlert[]>(() => store.queryData()?.alerts ?? []),
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
  withMethods(
    (
      store,
      organizationService = inject<OrganizationService>(OrganizationService),
      activeOrganizationStore = inject<ActiveOrganizationStore>(ActiveOrganizationStore),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * NgRx `rxMethod` that fetches the dashboard KPI payload
       * whenever the organization ID signal emits a new value.
       * Changing organization clears the previous payload before loading. A refresh
       * retains data only in the same organization; obsolete responses are ignored.
       *
       * @access public
       * @since 1.0.0
       * @param {string | undefined} organizationId - Active organization, or cancellation.
       * @returns {void}
       */
      load: rxMethod<string | undefined>(
        pipe(
          filter(
            (organizationId) =>
              !organizationId ||
              organizationId === activeOrganizationStore.selectedOrganizationId(),
          ),
          switchMap((organizationId) => {
            const activeOrganizationId = activeOrganizationStore.selectedOrganizationId();
            if (store.queryOrganizationId() !== activeOrganizationId) {
              patchState(store, resetQuery(), { queryOrganizationId: activeOrganizationId });
            }
            if (!organizationId || organizationId !== activeOrganizationId) return EMPTY;

            patchState(store, setPendingQuery());

            const now: Date = new Date();
            const to: string = now.toISOString();
            const from: string = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

            return organizationService.getDashboard(organizationId, { from, to }).pipe(
              tapResponse({
                next: (data) => {
                  if (activeOrganizationStore.selectedOrganizationId() !== organizationId) return;
                  patchState(store, setSuccessQuery(data));
                },
                error: (err) => {
                  if (activeOrganizationStore.selectedOrganizationId() !== organizationId) return;
                  patchState(store, setErrorQuery(toStoreError(err)));
                },
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
   * Derives the organization ID forwarded to {@link load}. Declared in
   * `withComputed` so that derived state is not created imperatively
   * inside `onInit`.
   *
   * @since 1.0.0
   */
  withComputed((_store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject<ActiveOrganizationStore>(ActiveOrganizationStore);

    return {
      loadParams: computed<string | undefined>(() => {
        if (!isPlatformBrowser(platformId)) return undefined;
        return activeOrganizationStore.selectedOrganizationId() ?? undefined;
      }),
    };
  }),

  /**
   * Feature withHooks
   *
   * @description
   * Connects {@link loadParams} to {@link load} on store init and clears the
   * query scope when its organization disappears.
   *
   * @since 1.0.0
   */
  withHooks((store, activeOrganizationStore = inject(ActiveOrganizationStore)) => ({
    onInit() {
      store.load(store.loadParams);
      effect(() => {
        const organizationId = activeOrganizationStore.selectedOrganizationId();
        untracked(() => {
          if (store.queryOrganizationId() !== organizationId) store.load(undefined);
        });
      });
    },
  })),
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
