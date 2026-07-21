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
} from '@core/request-state';
import { OrganizationService } from '@features/organization/data-access';
import {
  adaptEquipmentStatus,
  type EquipmentStatusBucket,
} from '@features/organization/data-access/adapters/organization-dashboard-equipment-status.adapter';
import {
  adaptInspectionResult,
  type InspectionResultBucket,
} from '@features/organization/data-access/adapters/organization-dashboard-inspection-result.adapter';
import {
  adaptNonConformitySeverity,
  type NonConformitySeverityBucket,
} from '@features/organization/data-access/adapters/organization-dashboard-severity.adapter';
import type { OrganizationDashboardOutput } from '@features/organization/models';
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
 * Function readOverviewMetric
 *
 * @description
 * Reads one metric out of an overview section by key.
 *
 * The sections arrive as a flat `{ key, value }` list, so a caller that wants
 * a specific figure has to find it — taking `summary[0]` only ever yields
 * whatever the backend happened to put first.
 *
 * @param {unknown} section - One `overview.<widget>` section.
 * @param {string} key - Metric key to read.
 * @returns {number | null} The value, or null when the section or key is absent.
 */
function readOverviewMetric(section: unknown, key: string): number | null {
  const summary: unknown = (section as Record<string, unknown> | undefined)?.['summary'];
  if (!Array.isArray(summary)) return null;

  for (const entry of summary) {
    if (typeof entry !== 'object' || entry === null) continue;

    const record = entry as Record<string, unknown>;
    if (record['key'] === key && typeof record['value'] === 'number') {
      return record['value'];
    }
  }

  return null;
}

/**
 * Store OrganizationDashboardStore
 * @const OrganizationDashboardStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the aggregate `/dashboard`
 * endpoint. Fetches the overview payload for the active organization and
 * exposes derived signals for the metric strip (open/overdue interventions,
 * open non-conformities) and the breakdown cards (severity, equipment
 * status, inspection results).
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
  //#endregion

  //#region Computed

  /**
   * Feature withComputed
   *
   * @description
   * Derives the metric-strip counts and the population breakdowns
   * from the raw `queryData` signal.
   *
   * @since 1.0.0
   */
  withComputed((store) => ({
    /**
     * Computed nonConformitiesBySeverity
     *
     * @description
     * Open non-conformities split by severity, worst first.
     *
     * The backend has published this breakdown since L3.10 and nothing on the
     * frontend read it: `overview.nonConformities.summary` carries the
     * `severity*` keys alongside the status counts, and every consumer only
     * ever took `summary[0]`.
     *
     * @type {Signal<readonly NonConformitySeverityBucket[]>}
     */
    nonConformitiesBySeverity: computed<readonly NonConformitySeverityBucket[]>(() =>
      adaptNonConformitySeverity(store.queryData()?.overview?.['nonConformities']?.['summary']),
    ),

    /**
     * Computed equipmentByStatus
     *
     * @description
     * The equipment fleet split by status, healthiest first.
     *
     * Same untapped shape as {@link nonConformitiesBySeverity}:
     * `overview.equipment.summary` has carried the per-status counts all along
     * and every consumer only ever took `summary[0]`, the total.
     *
     * @type {Signal<readonly EquipmentStatusBucket[]>}
     */
    equipmentByStatus: computed<readonly EquipmentStatusBucket[]>(() =>
      adaptEquipmentStatus(store.queryData()?.overview?.['equipment']?.['summary']),
    ),

    /**
     * Computed inspectionsByResult
     *
     * @description
     * Inspections split by outcome — pass, partial, fail — best first.
     *
     * Third case of the same shape: the handler has written `pass`/`partial`/
     * `fail` into `overview.inspections.summary` all along, next to the
     * workflow-state counts, and every consumer only ever took `summary[0]`.
     *
     * @type {Signal<readonly InspectionResultBucket[]>}
     */
    inspectionsByResult: computed<readonly InspectionResultBucket[]>(() =>
      adaptInspectionResult(store.queryData()?.overview?.['inspections']?.['summary']),
    ),

    /**
     * Computed openInterventionCount
     *
     * @description
     * Interventions still in flight, read by key from
     * `overview.interventions.summary`. The section is absent for a member
     * without `organization.interventions.read`, which reads as `null` — no
     * figure — rather than zero.
     *
     * @since 1.1.0
     */
    openInterventionCount: computed<OrganizationDashboardKpiValue>(
      () => readOverviewMetric(store.queryData()?.overview?.['interventions'], 'open') ?? null,
    ),

    /**
     * Computed overdueInterventionCount
     *
     * @description
     * Open interventions past their due date. Counted server-side over open
     * ones only: a published intervention that finished late is history, not
     * something to act on.
     *
     * @since 1.1.0
     */
    overdueInterventionCount: computed<OrganizationDashboardKpiValue>(
      () => readOverviewMetric(store.queryData()?.overview?.['interventions'], 'overdue') ?? null,
    ),
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
  withMethods((store, organizationService = inject<OrganizationService>(OrganizationService)) => ({
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
  withComputed((_store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject<ActiveOrganizationStore>(ActiveOrganizationStore);

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
