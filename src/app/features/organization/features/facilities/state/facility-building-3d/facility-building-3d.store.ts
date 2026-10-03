import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  resetQuery,
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
  FacilityBuildingModelEquipment,
  FacilityBuildingModelFloor,
  FacilityBuildingModelOutput,
  FacilityPlanOverlayZone,
} from '@features/organization/features/facilities/models';
import { isMetricFacilityFloor } from '@features/organization/features/facilities/utils';
import { facilityBuilding3dStoreEvents } from './events';
import type { FacilityBuilding3dState } from './models';

//#region Initial State
/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seeds {@link FacilityBuilding3dState}. Query state (`_queryStatus`,
 * `_queryError`, `_queryData`) is initialised by `withQueryState`.
 *
 * @since 1.0.0
 *
 * @constant INITIAL_STATE
 */
const INITIAL_STATE: FacilityBuilding3dState = {
  selectedFloorId: null,
  selectedRoomId: null,
  selectedEquipmentId: null,
  metric: false,
  scopeKey: null,
  isolatedFloorId: null,
  exploded: false,
  cameraResetToken: 0,
};
//#endregion

/**
 * Constant FacilityBuilding3dStore
 *
 * @description
 * Route-scoped store for the building 3D view: the read-only building
 * model (one primary query, `withQueryState`) plus the view-local
 * selection, floor isolation, exploded layout and camera-reset request the
 * 3D scene renders against. The scene itself, and any per-frame hover
 * state, live entirely outside this store — a 60Hz `patchState` would be a
 * store misuse this slice deliberately avoids.
 * `loadModel` is guarded to the browser platform: the building model is
 * secondary tab data for a route already rendered by its parent facility
 * page, the same convention `FacilityDetailPage`'s Plans tab follows, so
 * SSR renders a pure skeleton for this view with no server-side fetch.
 * `loadModel`'s success handler also selects the model's first floor
 * (server order) whenever nothing is selected yet — the only way a room can
 * be selected is `selectRoom`, called from the scene's pointer-only
 * `roomActivated`, so without this default a keyboard/screen-reader user
 * would have no path at all into `FacilityBuilding3dRoomPanel` (WCAG 2.1.1).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @constant FacilityBuilding3dStore
 */
export const FacilityBuilding3dStore = signalStore(
  withQueryState<FacilityBuildingModelOutput>(),
  withState<FacilityBuilding3dState>(INITIAL_STATE),

  withComputed((store) => ({
    /**
     * @description
     * The loaded model's floors, in the exact server order — never
     * re-sorted, per the model's own contract.
     */
    floors: computed<ReadonlyArray<FacilityBuildingModelFloor>>(
      () => store.queryData()?.floors ?? [],
    ),
  })),

  withComputed((store) => ({
    /**
     * @description
     * The currently selected floor, or `null` when none matches.
     */
    selectedFloor: computed<FacilityBuildingModelFloor | null>(() => {
      const selectedFloorId: string | null = store.selectedFloorId();
      if (!selectedFloorId) return null;

      return store.floors().find((floor) => floor.facilityId === selectedFloorId) ?? null;
    }),

    /**
     * @description
     * The currently selected room, or `null` when none matches.
     */
    selectedRoom: computed<FacilityPlanOverlayZone | null>(() => {
      const selectedRoomId: string | null = store.selectedRoomId();
      if (!selectedRoomId) return null;

      for (const floor of store
        .floors()
        .filter((candidateFloor) => candidateFloor.facilityId === store.selectedFloorId())) {
        const room: FacilityPlanOverlayZone | undefined = floor.rooms.find(
          (candidate) => candidate.facilityId === selectedRoomId,
        );
        if (room) return room;
      }

      return null;
    }),

    /**
     * @description
     * Selected equipment on the current floor.
     */
    selectedEquipment: computed<FacilityBuildingModelEquipment | null>(
      () =>
        store
          .floors()
          .find((floor) => floor.facilityId === store.selectedFloorId())
          ?.equipment?.find((equipment) => equipment.equipmentId === store.selectedEquipmentId()) ??
        null,
    ),

    /**
     * @description
     * Floors with complete physical placement, in server order.
     */
    metricFloors: computed(() => store.floors().filter(isMetricFacilityFloor)),

    /**
     * @description
     * True once the model has loaded and the building has no floors.
     */
    isEmpty: computed<boolean>(() => store.isQueryLoaded() && store.floors().length === 0),

    /**
     * @description
     * True when the building has floors but not one of them carries geometry.
     * A distinct state from {@link isEmpty}, and a common one: floors are
     * created long before anyone digitizes a plan. Both would otherwise render
     * an empty canvas with nothing to explain it — the scene has nothing to
     * extrude, but the record is not empty either, and the remedy is different
     * (digitize a plan, rather than add a floor).
     */
    hasNoGeometry: computed<boolean>(
      () =>
        store.isQueryLoaded() &&
        store.floors().length > 0 &&
        store.floors().every((floor) => floor.outline === null && floor.rooms.length === 0),
    ),
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
       *
       * @description
       * Internal rxMethod fetching one building's 3D model. Exposed as
       * {@link loadModel}, which adds the browser-only guard.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; facilityId: string }>}
       *
       * @constant loadModelFn
       */
      const loadModelFn = rxMethod<{ organizationId: string; facilityId: string }>(
        pipe(
          tap(({ organizationId, facilityId }): void => {
            const scopeKey: string = `${organizationId}/${facilityId}`;
            if (store.scopeKey() !== scopeKey) {
              patchState(store, resetQuery(), INITIAL_STATE, { scopeKey });
            }
            patchState(store, setPendingQuery());
          }),
          switchMap(({ organizationId, facilityId }) =>
            service.getBuildingModel(organizationId, facilityId).pipe(
              tapResponse({
                next: (model: FacilityBuildingModelOutput): void => {
                  patchState(store, setSuccessQuery(model));

                  const floor =
                    model.floors.find(
                      (candidate) => candidate.facilityId === store.selectedFloorId(),
                    ) ?? model.floors[0];
                  patchState(store, {
                    selectedFloorId: floor?.facilityId ?? null,
                    selectedRoomId: floor?.rooms.some(
                      (room) => room.facilityId === store.selectedRoomId(),
                    )
                      ? store.selectedRoomId()
                      : null,
                    selectedEquipmentId: floor?.equipment?.some(
                      (equipment) => equipment.equipmentId === store.selectedEquipmentId(),
                    )
                      ? store.selectedEquipmentId()
                      : null,
                    isolatedFloorId: model.floors.some(
                      (candidate) => candidate.facilityId === store.isolatedFloorId(),
                    )
                      ? store.isolatedFloorId()
                      : null,
                  });
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
         * @description
         * Selects a loaded floor and clears detail selections from other floors.
         *
         * @since 1.0.0
         *
         * @param {string | null} floorId - The floor to select, or `null` to clear it.
         *
         * @returns {void}
         */
        selectFloor(floorId: string | null): void {
          const floor = store.floors().find((candidate) => candidate.facilityId === floorId);
          patchState(store, {
            selectedFloorId: floor?.facilityId ?? null,
            selectedRoomId: floor?.rooms.some((room) => room.facilityId === store.selectedRoomId())
              ? store.selectedRoomId()
              : null,
            selectedEquipmentId: floor?.equipment?.some(
              (equipment) => equipment.equipmentId === store.selectedEquipmentId(),
            )
              ? store.selectedEquipmentId()
              : null,
            isolatedFloorId: store.isolatedFloorId() !== null ? (floor?.facilityId ?? null) : null,
          });
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
            patchState(store, { selectedRoomId: null, selectedEquipmentId: null });
            return;
          }

          const owningFloor: FacilityBuildingModelFloor | undefined = store
            .floors()
            .find((floor) => floor.rooms.some((room) => room.facilityId === roomId));

          if (!owningFloor) return;
          patchState(store, {
            selectedRoomId: roomId,
            selectedEquipmentId: null,
            selectedFloorId: owningFloor.facilityId,
            isolatedFloorId: store.isolatedFloorId() !== null ? owningFloor.facilityId : null,
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
         *
         * @param {string} floorId - The floor to isolate.
         *
         * @returns {void}
         */
        toggleIsolation(floorId: string): void {
          if (!store.floors().some((floor) => floor.facilityId === floorId)) return;
          patchState(store, {
            isolatedFloorId: store.isolatedFloorId() === floorId ? null : floorId,
            selectedFloorId: floorId,
            selectedRoomId: null,
            selectedEquipmentId: null,
          });
        },

        /**
         * @description
         * Selects an equipment and its floor without inventing a position.
         */
        selectEquipment(equipmentId: string): void {
          const floor = store
            .floors()
            .find((candidate) =>
              candidate.equipment?.some((equipment) => equipment.equipmentId === equipmentId),
            );
          if (!floor) return;
          patchState(store, {
            selectedFloorId: floor.facilityId,
            selectedRoomId: null,
            selectedEquipmentId: equipmentId,
            isolatedFloorId: store.isolatedFloorId() !== null ? floor.facilityId : null,
          });
        },

        /**
         * @description
         * Switches between schematic and physical rendering.
         */
        setMetric(metric: boolean): void {
          patchState(store, { metric, selectedRoomId: null, selectedEquipmentId: null });
        },

        /**
         * Method toggleExploded
         * @method toggleExploded
         *
         * @description
         * Toggles the vertically-exploded floor layout.
         *
         * @since 1.0.0
         *
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
         *
         * @returns {void}
         */
        resetCamera(): void {
          patchState(store, { cameraResetToken: store.cameraResetToken() + 1 });
        },

        /**
         * Method clearSelection
         * @method clearSelection
         *
         * @description
         * Clears the selected floor and room, leaving isolation and the exploded layout untouched.
         *
         * @since 1.0.0
         *
         * @returns {void}
         */
        clearSelection(): void {
          patchState(store, {
            selectedFloorId: null,
            selectedRoomId: null,
            selectedEquipmentId: null,
          });
        },
      };
    },
  ),
);

/**
 * Type FacilityBuilding3dStoreType
 *
 * @description
 * Instance type of the {@link FacilityBuilding3dStore} signal store.
 *
 * @since 1.0.0
 *
 * @type FacilityBuilding3dStoreType
 */
export type FacilityBuilding3dStoreType = InstanceType<typeof FacilityBuilding3dStore>;
