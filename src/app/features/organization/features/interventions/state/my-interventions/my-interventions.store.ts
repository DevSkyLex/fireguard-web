import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, forkJoin, from, map, of, pipe, switchMap, tap } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionOfflineService } from '@features/organization/features/interventions/services';
import type { MyInterventionsLoadRequest, MyInterventionsState } from './models';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial state for the component-scoped MyInterventionsStore.
 *
 * @since 1.0.0
 *
 * @type {MyInterventionsState}
 */
const INITIAL_STATE: MyInterventionsState = {
  interventions: [],
  loading: false,
};

/**
 * Store MyInterventionsStore
 * @const MyInterventionsStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the field agent intervention list.
 * Loads interventions assigned to the current member via the API when
 * online, or from the local offline cache when offline.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MyInterventionsStore = signalStore(
  withState<MyInterventionsState>(INITIAL_STATE),
  withComputed((store) => ({
    /**
     * Computed activeInterventions.
     *
     * @description
     * Interventions in an actionable state (planned, in-progress or
     * changes-requested) that the agent can open from the field list.
     */
    activeInterventions: computed<readonly InterventionOutput[]>(() =>
      store
        .interventions()
        .filter((intervention) =>
          ['planned', 'in_progress', 'changes_requested'].includes(intervention.status),
        ),
    ),
  })),
  withMethods(
    (
      store,
      service = inject<InterventionService>(InterventionService),
      members = inject<OrganizationMemberService>(OrganizationMemberService),
      offline = inject<InterventionOfflineService>(InterventionOfflineService),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Loads assigned interventions for the given organization. Falls back
       * to the local offline cache when connectivity is unavailable or the
       * API returns a network error.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<MyInterventionsLoadRequest>}
       */
      load: rxMethod<MyInterventionsLoadRequest>(
        pipe(
          tap(() => patchState(store, { interventions: [], loading: true })),
          switchMap(({ organizationId, online }) => {
            if (!organizationId) return of([] as readonly InterventionOutput[]);
            if (!online) return from(offline.listInterventions(organizationId));

            return members.getCurrentProfile(organizationId).pipe(
              switchMap((profile) => {
                const member = `/api/organizations/${organizationId}/members/${profile.id}`;
                return forkJoin({
                  responsible: service.listAll(organizationId, { responsible: member }),
                  participant: service.listAll(organizationId, { participant: member }),
                });
              }),
              map(({ responsible, participant }) => [
                ...new Map(
                  [...responsible, ...participant].map((intervention) => [
                    intervention.id,
                    intervention,
                  ]),
                ).values(),
              ]),
              catchError((error: unknown) =>
                error instanceof HttpErrorResponse && error.status !== 0
                  ? of([] as readonly InterventionOutput[])
                  : from(offline.listInterventions(organizationId)),
              ),
            );
          }),
          tapResponse({
            next: (interventions) => patchState(store, { interventions, loading: false }),
            error: () => patchState(store, { interventions: [], loading: false }),
          }),
        ),
      ),
    }),
  ),
);

/**
 * Type MyInterventionsStoreType
 * @type MyInterventionsStoreType
 *
 * @description
 * Injectable instance type exposed by {@link MyInterventionsStore}.
 *
 * @since 1.0.0
 */
export type MyInterventionsStoreType = InstanceType<typeof MyInterventionsStore>;
