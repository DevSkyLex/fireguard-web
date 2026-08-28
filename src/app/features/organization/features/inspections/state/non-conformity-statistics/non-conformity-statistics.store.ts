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
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  NonConformityStatisticsOptions,
  NonConformityStatisticsOutput,
} from '@features/organization/features/inspections/models';

/**
 * Type NonConformityStatisticsLoadParams
 *
 * @description
 * One load request: the organization and the optional `createdAt` window.
 * `undefined` as a whole is silently ignored so a not-yet-resolved route
 * param never issues a malformed request.
 *
 * @since 1.0.0
 */
export type NonConformityStatisticsLoadParams = {
  readonly organizationId: string;
  readonly window?: NonConformityStatisticsOptions;
};

/**
 * Store NonConformityStatisticsStore
 * @const NonConformityStatisticsStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the organization-wide
 * non-conformity KPI snapshot
 * (`GET /organizations/{organizationId}/non-conformities/statistics`)
 * backing the inspections analytics page. One primary query, so
 * `withQueryState` — the whole payload is refetched when the organization
 * or the period window changes, mirroring `InterventionStatisticsStore`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const NonConformityStatisticsStore = signalStore(
  withQueryState<NonConformityStatisticsOutput>(),
  withMethods((store, service = inject<InspectionService>(InspectionService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Fetches the statistics snapshot for the given organization and
     * window, cancelling any in-flight request.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {RxMethod<NonConformityStatisticsLoadParams | undefined>}
     */
    load: rxMethod<NonConformityStatisticsLoadParams | undefined>(
      pipe(
        switchMap((request) => {
          if (!request) return EMPTY;

          patchState(store, setPendingQuery());

          return service.getNonConformityStatistics(request.organizationId, request.window).pipe(
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
 * Type NonConformityStatisticsStoreType
 * @type NonConformityStatisticsStoreType
 *
 * @description
 * Injectable instance type exposed by {@link NonConformityStatisticsStore}.
 *
 * @since 1.0.0
 */
export type NonConformityStatisticsStoreType = InstanceType<typeof NonConformityStatisticsStore>;
