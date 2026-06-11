import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/state/request-state';
import { MissionService } from '@features/organization/features/missions/data-access';
import type { MissionOutput } from '@features/organization/features/missions/models';
import { missionStoreEvents } from './events';
import type { MissionState } from './models';

//#region Initial State
/**
 * Constant INITIAL_MISSION_STATE
 * @const INITIAL_MISSION_STATE
 *
 * @description
 * Initial state for the component-scoped MissionStore.
 *
 * @since 1.0.0
 */
const INITIAL_MISSION_STATE: MissionState = {
  totalMissions: 0,
  listCallState: idleCallState(),
  createCallState: idleCallState<MissionOutput>(),
} as const;
//#endregion

/**
 * Store MissionStore
 * @const MissionStore
 *
 * @description
 * Component-scoped NgRx SignalStore for mission list and creation workflows.
 * The store owns request state and normalized mission entities; route pages
 * remain responsible for navigation and UI composition.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MissionStore = signalStore(
  withEntities({ entity: type<MissionOutput>(), collection: 'mission' }),
  withState<MissionState>(INITIAL_MISSION_STATE),
  withComputed((store) => ({
    /** All cached missions for the active organization. */
    missionList: computed<ReadonlyArray<MissionOutput>>(() => store.missionEntities()),

    /** True while the mission list is loading. */
    isLoadingMissions: computed<boolean>(() => store.listCallState().status === 'pending'),

    /** True while mission creation is in-flight. */
    isCreating: computed<boolean>(() => store.createCallState().status === 'pending'),

    /** Last mission created by the store, if any. */
    createdMission: computed<MissionOutput | null>(() => store.createCallState().data),

    /** True when there are no missions and the list is not loading. */
    isEmpty: computed<boolean>(
      () => store.missionIds().length === 0 && store.listCallState().status !== 'pending',
    ),
  })),
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      missionService: MissionService = inject<MissionService>(MissionService),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Loads missions for the active organization.
       *
       * @type {RxMethod<{ organizationId: string }>}
       */
      load: rxMethod<{ organizationId: string }>(
        pipe(
          tap((): void => patchState(store, { listCallState: pendingCallState() })),
          switchMap(({ organizationId }) =>
            missionService.list(organizationId).pipe(
              tapResponse({
                next: (response: HydraCollection<MissionOutput>): void => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'mission' }),
                    {
                      totalMissions: response.totalItems,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    missionStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load missions'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method create
       * @method create
       *
       * @description
       * Creates a mission and stores it in the local entity collection.
       * Uses `exhaustMap` to avoid duplicate submissions.
       *
       * @type {RxMethod<{ organizationId: string; name: string }>}
       */
      create: rxMethod<{ organizationId: string; name: string }>(
        pipe(
          tap((): void =>
            patchState(store, { createCallState: pendingCallState<MissionOutput>() }),
          ),
          exhaustMap(({ organizationId, name }) =>
            missionService.create(organizationId, name).pipe(
              tapResponse({
                next: (mission: MissionOutput): void => {
                  patchState(store, addEntity(mission, { collection: 'mission' }), {
                    totalMissions: store.totalMissions() + 1,
                    createCallState: successCallState(mission),
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { createCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    missionStoreEvents.createFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to create mission'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /** Clears the last created mission navigation handoff. */
      clearCreatedMission(): void {
        patchState(store, { createCallState: idleCallState<MissionOutput>() });
      },
    }),
  ),
);

export type MissionStoreType = InstanceType<typeof MissionStore>;
