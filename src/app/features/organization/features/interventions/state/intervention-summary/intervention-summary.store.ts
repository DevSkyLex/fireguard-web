import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap, tap } from 'rxjs';
import {
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';

/**
 * Constant TERMINAL_STATUSES
 * @const TERMINAL_STATUSES
 *
 * @description
 * Statuses that close an intervention's active workflow. An intervention in one
 * of these states is excluded from the "overdue" and "blocked" attention
 * metrics — a published or abandoned intervention needs no further action.
 *
 * @since 1.0.0
 *
 * @type {ReadonlySet<InterventionStatus>}
 */
const TERMINAL_STATUSES: ReadonlySet<InterventionStatus> = new Set<InterventionStatus>([
  'published',
  'abandoned',
]);

/**
 * Counts interventions in the collection whose status matches the given value.
 *
 * @param {readonly InterventionOutput[]} interventions - Full intervention set.
 * @param {InterventionStatus} status - Status to count.
 * @returns {number} Number of interventions in that status.
 */
function countByStatus(
  interventions: readonly InterventionOutput[],
  status: InterventionStatus,
): number {
  return interventions.filter((intervention) => intervention.status === status).length;
}

/**
 * Store InterventionSummaryStore
 * @const InterventionSummaryStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the interventions dashboard metric
 * strip. A single {@link load} fetches every organization intervention (paged
 * through {@link InterventionService.listAll}) and the store derives the
 * workflow-health KPIs — in progress, planned, overdue and blocked — from the
 * cached collection. Overdue and blocked exclude interventions in a terminal
 * status ({@link TERMINAL_STATUSES}) since those need no further action.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionSummaryStore = signalStore(
  withQueryState<readonly InterventionOutput[]>(),
  withComputed((store) => ({
    /**
     * Computed interventions.
     *
     * @description
     * Cached intervention collection, or an empty array before the first load.
     */
    interventions: computed<readonly InterventionOutput[]>(() => store.queryData() ?? []),

    /**
     * Computed loading.
     *
     * @description
     * True while the summary dataset is loading.
     */
    loading: computed<boolean>(() => store.isQueryLoading()),

    /**
     * Computed total.
     *
     * @description
     * Total number of interventions in the organization.
     */
    total: computed<number>(() => (store.queryData() ?? []).length),

    /**
     * Computed inProgressCount.
     *
     * @description
     * Interventions currently being executed in the field.
     */
    inProgressCount: computed<number>(() => countByStatus(store.queryData() ?? [], 'in_progress')),

    /**
     * Computed plannedCount.
     *
     * @description
     * Interventions scheduled but not yet started.
     */
    plannedCount: computed<number>(() => countByStatus(store.queryData() ?? [], 'planned')),

    /**
     * Computed overdueCount.
     *
     * @description
     * Non-terminal interventions whose due date has passed — the field work that
     * needs attention first.
     */
    overdueCount: computed<number>(() => {
      const now: number = Date.now();
      return (store.queryData() ?? []).filter((intervention) => {
        if (!intervention.dueAt || TERMINAL_STATUSES.has(intervention.status)) return false;
        const due: number = new Date(intervention.dueAt).getTime();
        return !Number.isNaN(due) && due < now;
      }).length;
    }),

    /**
     * Computed blockedCount.
     *
     * @description
     * Non-terminal interventions carrying at least one blocker-severity issue
     * preventing publication.
     */
    blockedCount: computed<number>(
      () =>
        (store.queryData() ?? []).filter(
          (intervention) =>
            intervention.blockersCount > 0 && !TERMINAL_STATUSES.has(intervention.status),
        ).length,
    ),
  })),
  withMethods((store, service = inject<InterventionService>(InterventionService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Loads every intervention for the given organization and caches it as the
     * summary query data. Resolves to an empty set when no organization is
     * active. Failures surface as an error query state; the metric strip keeps
     * its last values while a refetch is in flight.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {RxMethod<string | null>}
     */
    load: rxMethod<string | null>(
      pipe(
        tap(() => patchState(store, setPendingQuery())),
        switchMap((organizationId) => {
          if (!organizationId) {
            patchState(store, setSuccessQuery<readonly InterventionOutput[]>([]));
            return EMPTY;
          }

          return service.listAll(organizationId).pipe(
            tapResponse({
              next: (interventions) => patchState(store, setSuccessQuery(interventions)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
);

/**
 * Type InterventionSummaryStoreType
 * @type InterventionSummaryStoreType
 *
 * @description
 * Injectable instance type exposed by {@link InterventionSummaryStore}.
 *
 * @since 1.0.0
 */
export type InterventionSummaryStoreType = InstanceType<typeof InterventionSummaryStore>;
