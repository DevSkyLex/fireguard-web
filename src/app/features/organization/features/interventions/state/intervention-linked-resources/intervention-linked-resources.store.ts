import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  isCallSuccess,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { interventionLinkedResourcesStoreEvents } from './events';
import type { InterventionLinkedResourcesState } from './models';

const INITIAL_STATE: InterventionLinkedResourcesState = {
  loadedForInterventionId: null,
  facilitiesCallState: idleCallState(),
  equipmentCallState: idleCallState(),
  inspectionsCallState: idleCallState(),
};

/**
 * Store InterventionLinkedResourcesStore
 * @const InterventionLinkedResourcesStore
 *
 * @description
 * Component-scoped NgRx SignalStore behind the intervention detail page's
 * "Linked" tabs (Facilities / Equipment / Inspections). Each resource is its
 * own named call state and its own `rxMethod`, fetched from the canonical
 * cross-feature services (`listByIntervention`) the first time its tab is
 * activated — never eagerly with the rest of the workspace — and cached
 * until {@link InterventionLinkedResourcesStore.ensureFacilitiesLoaded} (or
 * its equipment/inspection siblings) is asked for a different intervention,
 * which resets all three call states together.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionLinkedResourcesStore = signalStore(
  withState<InterventionLinkedResourcesState>(INITIAL_STATE),
  withComputed((store) => ({
    /** Linked facilities from the last successful fetch, or empty. */
    facilities: computed<readonly FacilityOutput[]>(() => {
      const state = store.facilitiesCallState();
      return isCallSuccess(state) ? state.data : [];
    }),

    /** Whether the linked-facilities fetch is in flight. */
    facilitiesLoading: computed<boolean>(() => isCallPending(store.facilitiesCallState())),

    /** The linked-facilities fetch's normalized error, or `null`. */
    facilitiesError: computed<StoreError | null>(() => store.facilitiesCallState().error),

    /** Linked equipment from the last successful fetch, or empty. */
    equipment: computed<readonly EquipmentOutput[]>(() => {
      const state = store.equipmentCallState();
      return isCallSuccess(state) ? state.data : [];
    }),

    /** Whether the linked-equipment fetch is in flight. */
    equipmentLoading: computed<boolean>(() => isCallPending(store.equipmentCallState())),

    /** The linked-equipment fetch's normalized error, or `null`. */
    equipmentError: computed<StoreError | null>(() => store.equipmentCallState().error),

    /** Linked inspections from the last successful fetch, or empty. */
    inspections: computed<readonly InspectionOutput[]>(() => {
      const state = store.inspectionsCallState();
      return isCallSuccess(state) ? state.data : [];
    }),

    /** Whether the linked-inspections fetch is in flight. */
    inspectionsLoading: computed<boolean>(() => isCallPending(store.inspectionsCallState())),

    /** The linked-inspections fetch's normalized error, or `null`. */
    inspectionsError: computed<StoreError | null>(() => store.inspectionsCallState().error),
  })),
  withMethods(
    (
      store,
      facilityService = inject<FacilityService>(FacilityService),
      equipmentService = inject<EquipmentService>(EquipmentService),
      inspectionService = inject<InspectionService>(InspectionService),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => {
      const loadFacilities = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { facilitiesCallState: pendingCallState() })),
          switchMap((interventionId) =>
            facilityService.listByIntervention(interventionId).pipe(
              tapResponse({
                next: (response) =>
                  patchState(store, { facilitiesCallState: successCallState(response.member) }),
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { facilitiesCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionLinkedResourcesStoreEvents.facilitiesLoadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load linked facilities'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      const loadEquipment = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { equipmentCallState: pendingCallState() })),
          switchMap((interventionId) =>
            equipmentService.listByIntervention(interventionId).pipe(
              tapResponse({
                next: (response) =>
                  patchState(store, { equipmentCallState: successCallState(response.member) }),
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { equipmentCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionLinkedResourcesStoreEvents.equipmentLoadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load linked equipment'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      const loadInspections = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { inspectionsCallState: pendingCallState() })),
          switchMap((interventionId) =>
            inspectionService.listByIntervention(interventionId).pipe(
              tapResponse({
                next: (response) =>
                  patchState(store, { inspectionsCallState: successCallState(response.member) }),
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { inspectionsCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionLinkedResourcesStoreEvents.inspectionsLoadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load linked inspections'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      /**
       * Resets all three call states to idle when the requested intervention
       * differs from the one the cache currently holds — a prev/next
       * navigation invalidates the previous intervention's cached tabs
       * without forcing an immediate refetch of tabs that stay unvisited.
       */
      function resetIfDifferentIntervention(interventionId: string): void {
        if (store.loadedForInterventionId() === interventionId) return;

        patchState(store, {
          loadedForInterventionId: interventionId,
          facilitiesCallState: idleCallState(),
          equipmentCallState: idleCallState(),
          inspectionsCallState: idleCallState(),
        });
      }

      return {
        /**
         * Method ensureFacilitiesLoaded
         *
         * @description
         * Loads the intervention's linked facilities the first time the
         * Facilities tab activates for it; a later call for the same
         * intervention is a no-op once the fetch has settled.
         *
         * @access public
         * @since 1.0.0
         *
         * @param {string} interventionId - The intervention shown on the page.
         *
         * @returns {void}
         */
        ensureFacilitiesLoaded(interventionId: string): void {
          resetIfDifferentIntervention(interventionId);
          if (store.facilitiesCallState().status === 'idle') loadFacilities(interventionId);
        },

        /**
         * Method ensureEquipmentLoaded
         *
         * @description
         * Loads the intervention's linked equipment the first time the
         * Equipment tab activates for it; a later call for the same
         * intervention is a no-op once the fetch has settled.
         *
         * @access public
         * @since 1.0.0
         *
         * @param {string} interventionId - The intervention shown on the page.
         *
         * @returns {void}
         */
        ensureEquipmentLoaded(interventionId: string): void {
          resetIfDifferentIntervention(interventionId);
          if (store.equipmentCallState().status === 'idle') loadEquipment(interventionId);
        },

        /**
         * Method ensureInspectionsLoaded
         *
         * @description
         * Loads the intervention's linked inspections the first time the
         * Inspections tab activates for it; a later call for the same
         * intervention is a no-op once the fetch has settled.
         *
         * @access public
         * @since 1.0.0
         *
         * @param {string} interventionId - The intervention shown on the page.
         *
         * @returns {void}
         */
        ensureInspectionsLoaded(interventionId: string): void {
          resetIfDifferentIntervention(interventionId);
          if (store.inspectionsCallState().status === 'idle') loadInspections(interventionId);
        },
      };
    },
  ),
);

/**
 * Type InterventionLinkedResourcesStoreType
 * @type InterventionLinkedResourcesStoreType
 *
 * @description
 * Injectable instance type exposed by {@link InterventionLinkedResourcesStore}.
 *
 * @since 1.0.0
 */
export type InterventionLinkedResourcesStoreType = InstanceType<
  typeof InterventionLinkedResourcesStore
>;
