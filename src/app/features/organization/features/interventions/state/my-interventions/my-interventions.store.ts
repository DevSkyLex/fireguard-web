import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, forkJoin, from, map, of, pipe, switchMap, tap } from 'rxjs';
import { OrganizationMemberService } from '@features/organization/data-access';
import { MissionService } from '@features/organization/features/missions/data-access';
import type { MissionOutput } from '@features/organization/features/missions/models';
import { MissionOfflineService } from '@features/organization/features/missions/services';
import type { MyMissionsLoadRequest, MyMissionsState } from './models';

const INITIAL_STATE: MyMissionsState = {
  missions: [],
  loading: false,
};

/**
 * Store MyMissionsStore.
 *
 * Signal-first state for the field agent mission list.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MyMissionsStore = signalStore(
  withState<MyMissionsState>(INITIAL_STATE),
  withComputed((store) => ({
    activeMissions: computed<readonly MissionOutput[]>(() =>
      store
        .missions()
        .filter((mission) =>
          ['planned', 'in_progress', 'changes_requested'].includes(mission.status),
        ),
    ),
  })),
  withMethods(
    (
      store,
      service = inject(MissionService),
      members = inject(OrganizationMemberService),
      offline = inject(MissionOfflineService),
    ) => ({
      load: rxMethod<MyMissionsLoadRequest>(
        pipe(
          tap(() => patchState(store, { missions: [], loading: true })),
          switchMap(({ organizationId, online }) => {
            if (!organizationId) return of([] as readonly MissionOutput[]);
            if (!online) return from(offline.listMissions(organizationId));

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
                  [...responsible, ...participant].map((mission) => [mission.id, mission]),
                ).values(),
              ]),
              catchError((error: unknown) =>
                error instanceof HttpErrorResponse && error.status !== 0
                  ? of([] as readonly MissionOutput[])
                  : from(offline.listMissions(organizationId)),
              ),
            );
          }),
          tapResponse({
            next: (missions) => patchState(store, { missions, loading: false }),
            error: () => patchState(store, { missions: [], loading: false }),
          }),
        ),
      ),
    }),
  ),
);

export type MyMissionsStoreType = InstanceType<typeof MyMissionsStore>;
