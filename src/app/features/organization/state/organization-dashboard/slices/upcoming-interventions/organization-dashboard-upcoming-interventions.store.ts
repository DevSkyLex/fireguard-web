import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, map, pipe, switchMap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';

/**
 * Constant UPCOMING_INTERVENTIONS_LIMIT
 * @const UPCOMING_INTERVENTIONS_LIMIT
 *
 * @description
 * Row budget of the dashboard card — the list stays scannable and the
 * "View all interventions" link carries the rest.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const UPCOMING_INTERVENTIONS_LIMIT: number = 5;

/**
 * Store UpcomingInterventionsStore
 * @const UpcomingInterventionsStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Upcoming interventions**
 * dashboard card. Queries the interventions collection of the nested
 * interventions feature through its published data-access API, keeping the
 * soonest-due rows: due date from now on, ascending, first page only.
 *
 * Left hook-free on purpose: the dashboard page wires `load` to a
 * permission-gated params signal (same contract as `ComplianceSummaryStore`),
 * so no request fires for members without `organization.interventions.read`.
 *
 * @example
 * ```typescript
 * @Component({ providers: [UpcomingInterventionsStore] })
 * export class OrganizationDashboard {
 *   private readonly upcomingStore = inject<UpcomingInterventionsStoreType>(UpcomingInterventionsStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const UpcomingInterventionsStore = signalStore(
  //#region State
  withQueryState<readonly InterventionOutput[]>(),
  //#endregion

  //#region Methods

  /**
   * Feature withMethods
   *
   * @description
   * Adds the `load` reactive method fetching the due-date-sorted
   * interventions page for the given organization.
   *
   * @since 1.0.0
   */
  withMethods((store, interventionService = inject<InterventionService>(InterventionService)) => ({
    /**
     * Method load
     *
     * @description
     * NgRx `rxMethod` that fetches the five soonest-due interventions
     * whenever the organization id signal emits. A `null` id — no
     * permission, or no active organization yet — is silently ignored.
     *
     * @since 1.0.0
     */
    load: rxMethod<string | null>(
      pipe(
        switchMap((organizationId: string | null) => {
          if (!organizationId) return EMPTY;

          patchState(store, setPendingQuery());

          return interventionService
            .list(organizationId, {
              itemsPerPage: UPCOMING_INTERVENTIONS_LIMIT,
              dueAtAfter: new Date().toISOString(),
              order: { dueAt: 'asc' },
            })
            .pipe(
              map(
                (collection: HydraCollection<InterventionOutput>): readonly InterventionOutput[] =>
                  collection.member,
              ),
              tapResponse({
                next: (interventions) => patchState(store, setSuccessQuery(interventions)),
                error: (err) => patchState(store, setErrorQuery(toStoreError(err))),
              }),
            );
        }),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type UpcomingInterventionsStoreType
 * @type UpcomingInterventionsStoreType
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type UpcomingInterventionsStoreType = InstanceType<typeof UpcomingInterventionsStore>;
