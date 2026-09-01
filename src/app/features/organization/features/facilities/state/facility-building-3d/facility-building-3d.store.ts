import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  toStoreFailureEventPayload,
  withQueryState,
  type StoreError,
} from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  FacilityBuildingModelFloor,
  FacilityBuildingModelOutput,
  FacilityPlanOverlayZone,
} from '@features/organization/features/facilities/models';
import { facilityBuilding3dStoreEvents } from './events';
import type { FacilityBuilding3dState } from './models';

//#region Initial State
/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Seeds {@link FacilityBuilding3dState}. Query state (`_queryStatus`,
 * `_queryError`, `_queryData`) is initialised by `withQueryState`.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: FacilityBuilding3dState = {
  selectedFloorId: null,
  selectedRoomId: null,
  isolatedFloorId: null,
  exploded: false,
  cameraResetToken: 0,
};
//#endregion

/**
 * Store FacilityBuilding3dStore
 * @const FacilityBuilding3dStore
 *
 * @description
 * Route-scoped store for the building 3D view: the read-only building
 * model (one primary query, `withQueryState`) plus the view-local
 * selection, floor isolation, exploded layout and camera-reset request the
 * 3D scene renders against. The scene itself, and any per-frame hover
 * state, live entirely outside this store — a 60Hz `patchState` would be a
 * store misuse this slice deliberately avoids.
 *
 * `loadModel` is guarded to the browser platform: the building model is
 * secondary tab data for a route already rendered by its parent facility
 * page, the same convention `FacilityDetailPage`'s Plans tab follows, so
 * SSR renders a pure skeleton for this view with no server-side fetch.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityBuilding3dStore = signalStore(
  withQueryState<FacilityBuildingModelOutput>(),
  withState<FacilityBuilding3dState>(INITIAL_STATE),

  withComputed((store) => ({
    /**
     * The loaded model's floors, in the exact server order — never
     * re-sorted, per the model's own contract.
     */
    floors: computed<ReadonlyArray<FacilityBuildingModelFloor>>(
      () => store.queryData()?.floors ?? [],
    ),
  })),

  withComputed((store) => ({
    /** The currently selected floor, or `null` when none matches. */
    selectedFloor: computed<FacilityBuildingModelFloor | null>(() => {
      const selectedFloorId: string | null = store.selectedFloorId();
      if (!selectedFloorId) return null;

      return store.floors().find((floor) => floor.facilityId === selectedFloorId) ?? null;
    }),

    /** The currently selected room, or `null` when none matches. */
    selectedRoom: computed<FacilityPlanOverlayZone | null>(() => {
      const selectedRoomId: string | null = store.selectedRoomId();
      if (!selectedRoomId) return null;

      for (const floor of store.floors()) {
        const room: FacilityPlanOverlayZone | undefined = floor.rooms.find(
          (candidate) => candidate.facilityId === selectedRoomId,
        );
        if (room) return room;
      }

      return null;
    }),

    /** True once the model has loaded and the building has no floors. */
    isEmpty: computed<boolean>(() => store.isQueryLoaded() && store.floors().length === 0),
  })),

  withMethods(
    (
      store,
      service: FacilityService = inject(FacilityService),
      dispatcher: Dispatcher = inject(Dispatcher),
      platformId: object = inject(PLATFORM_ID),
    ) => {
      /**
       * Constant loadModelFn
       * @const loadModelFn
       *
       * @description
       * Internal rxMethod fetching one building's 3D model. Exposed as
       * {@link loadModel}, which adds the browser-only guard.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; facilityId: string }>}
       */
      const loadModelFn = rxMethod<{ organizationId: string; facilityId: string }>(
        pipe(
          tap((): void => {
            patchState(store, setPendingQuery());
          }),
          switchMap(({ organizationId, facilityId }) =>
            service.getBuildingModel(organizationId, facilityId).pipe(
              tapResponse({
                next: (model: FacilityBuildingModelOutput): void => {
                  patchState(store, setSuccessQuery(model));
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, setErrorQuery(storeError));
                  dispatcher.dispatch(
                    facilityBuilding3dStoreEvents.modelLoadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load the building model'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      return {
        /**
         * Method loadModel
         * @method loadModel
         *
         * @description
         * Fetches one building's 3D model. A no-op outside the browser
         * platform so SSR never issues this request.
         *
         * @since 1.0.0
         *
         * @param {{ organizationId: string; facilityId: string }} params - The building to load.
         *
         * @returns {void}
         */
        loadModel(params: { organizationId: string; facilityId: string }): void {
          if (!isPlatformBrowser(platformId)) return;

          loadModelFn(params);
        },

        /**
         * Method selectFloor
         * @method selectFloor
         *
         * @description Selects a floor, without touching the current room selection.
         * @since 1.0.0
         * @param {string | null} floorId - The floor to select, or `null` to clear it.
         * @returns {void}
         */
        selectFloor(floorId: string | null): void {
          patchState(store, { selectedFloorId: floorId });
        },

        /**
         * Method selectRoom
         * @method selectRoom
         *
         * @description
         * Selects a room and resolves its owning floor from the loaded
         * model, since the 3D scene only ever reports the room id. Clearing
         * the room (`null`) leaves the floor selection untouched.
         *
         * @since 1.0.0
         *
         * @param {string | null} roomId - The room to select, or `null` to clear it.
         *
         * @returns {void}
         */
        selectRoom(roomId: string | null): void {
          if (roomId === null) {
            patchState(store, { selectedRoomId: null });
            return;
          }

          const owningFloor: FacilityBuildingModelFloor | undefined = store
            .floors()
            .find((floor) => floor.rooms.some((room) => room.facilityId === roomId));

          patchState(store, {
            selectedRoomId: roomId,
            selectedFloorId: owningFloor?.facilityId ?? store.selectedFloorId(),
          });
        },

        /**
         * Method toggleIsolation
         * @method toggleIsolation
         *
         * @description
         * Toggles floor isolation: isolating an already-isolated floor
         * clears it, showing every floor again.
         *
         * @since 1.0.0
         * @param {string} floorId - The floor to isolate.
         * @returns {void}
         */
        toggleIsolation(floorId: string): void {
          patchState(store, {
            isolatedFloorId: store.isolatedFloorId() === floorId ? null : floorId,
          });
        },

        /**
         * Method toggleExploded
         * @method toggleExploded
         *
         * @description Toggles the vertically-exploded floor layout.
         * @since 1.0.0
         * @returns {void}
         */
        toggleExploded(): void {
          patchState(store, { exploded: !store.exploded() });
        },

        /**
         * Method resetCamera
         * @method resetCamera
         *
         * @description
         * Requests a camera recentre by incrementing `cameraResetToken` —
         * the 3D scene watches this value for changes, not its magnitude.
         *
         * @since 1.0.0
         * @returns {void}
         */
        resetCamera(): void {
          patchState(store, { cameraResetToken: store.cameraResetToken() + 1 });
        },

        /**
         * Method clearSelection
         * @method clearSelection
         *
         * @description Clears the selected floor and room, leaving isolation and the exploded layout untouched.
         * @since 1.0.0
         * @returns {void}
         */
        clearSelection(): void {
          patchState(store, { selectedFloorId: null, selectedRoomId: null });
        },
      };
    },
  ),
);

/**
 * Type FacilityBuilding3dStoreType
 * @type FacilityBuilding3dStoreType
 *
 * @description
 * Instance type of the {@link FacilityBuilding3dStore} signal store.
 *
 * @since 1.0.0
 */
export type FacilityBuilding3dStoreType = InstanceType<typeof FacilityBuilding3dStore>;
