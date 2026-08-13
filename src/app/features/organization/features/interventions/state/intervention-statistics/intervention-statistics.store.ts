import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionStatisticsOutput } from '@features/organization/features/interventions/models';

/**
 * Store InterventionStatisticsStore
 * @const InterventionStatisticsStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the whole-organization intervention
 * statistics snapshot (`GET /interventions/statistics`) backing the list
 * page's KPI strip. One primary query, so `withQueryState` — no filters, no
 * pagination: the snapshot is org-wide and reloaded only on an organization
 * change, never on the list's own filters (`FEATURE.md`).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionStatisticsStore = signalStore(
  withQueryState<InterventionStatisticsOutput>(),
  withMethods((store, service = inject<InterventionService>(InterventionService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Fetches the statistics snapshot for the given organization. Undefined
     * is silently ignored so a not-yet-resolved route param never issues a
     * malformed request.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {RxMethod<string | undefined>}
     */
    load: rxMethod<string | undefined>(
      pipe(
        switchMap((organizationId) => {
          if (!organizationId) return EMPTY;

          patchState(store, setPendingQuery());

          return service.statistics(organizationId).pipe(
            tapResponse({
              next: (data) => patchState(store, setSuccessQuery(data)),
              error: (err: unknown) => patchState(store, setErrorQuery(toStoreError(err))),
            }),
          );
        }),
      ),
    ),
  })),
);

/**
 * Type InterventionStatisticsStoreType
 * @type InterventionStatisticsStoreType
 *
 * @description
 * Injectable instance type exposed by {@link InterventionStatisticsStore}.
 *
 * @since 1.0.0
 */
export type InterventionStatisticsStoreType = InstanceType<typeof InterventionStatisticsStore>;
