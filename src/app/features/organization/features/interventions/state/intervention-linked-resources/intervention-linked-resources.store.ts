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

/**
 * Constant LINKED_RESOURCES_PAGE_SIZE
 *
 * @description
 * The explicit page size sent to `listByIntervention` for all three linked
 * tabs. The server defaults to 30 items when no `itemsPerPage` is given,
 * which silently truncated an intervention linking more than 30 facilities,
 * pieces of equipment, or inspections with no indication more existed —
 * stating the size explicitly is what makes `<resource>HasMore` and "Show
 * more" possible.
 *
 * @since 1.1.0
 */
export const LINKED_RESOURCES_PAGE_SIZE = 30;

const INITIAL_STATE: InterventionLinkedResourcesState = {
  loadedForInterventionId: null,
  facilitiesCallState: idleCallState(),
  facilitiesPage: 0,
  facilitiesTotalItems: 0,
  facilitiesLoadingMore: false,
  equipmentCallState: idleCallState(),
  equipmentPage: 0,
  equipmentTotalItems: 0,
  equipmentLoadingMore: false,
  inspectionsCallState: idleCallState(),
  inspectionsPage: 0,
  inspectionsTotalItems: 0,
  inspectionsLoadingMore: false,
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
 * which resets all three call states together. Each resource is fetched
 * {@link LINKED_RESOURCES_PAGE_SIZE} items at a time; `loadMoreFacilities`
 * and its equipment/inspection siblings append the next page onto the rows
 * already on screen rather than replacing them.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionLinkedResourcesStore = signalStore(
  withState<InterventionLinkedResourcesState>(INITIAL_STATE),
  withComputed((store) => ({
    /** The loaded linked facilities, preserved through a failed page append. */
    facilities: computed<readonly FacilityOutput[]>(() => {
      const state = store.facilitiesCallState();
      return state.data ?? [];
    }),

    /** Whether the linked-facilities fetch is in flight. */
    facilitiesLoading: computed<boolean>(() => isCallPending(store.facilitiesCallState())),

    /** The linked-facilities fetch's normalized error, or `null`. */
    facilitiesError: computed<StoreError | null>(() => store.facilitiesCallState().error),

    /** Whether the server holds more linked facilities than are loaded. */
    facilitiesHasMore: computed<boolean>(() => {
      const state = store.facilitiesCallState();
      return isCallSuccess(state) && store.facilitiesTotalItems() > state.data.length;
    }),

    /** The loaded linked equipment, preserved through a failed page append. */
    equipment: computed<readonly EquipmentOutput[]>(() => {
      const state = store.equipmentCallState();
      return state.data ?? [];
    }),

    /** Whether the linked-equipment fetch is in flight. */
    equipmentLoading: computed<boolean>(() => isCallPending(store.equipmentCallState())),

    /** The linked-equipment fetch's normalized error, or `null`. */
    equipmentError: computed<StoreError | null>(() => store.equipmentCallState().error),

    /** Whether the server holds more linked equipment than is loaded. */
    equipmentHasMore: computed<boolean>(() => {
      const state = store.equipmentCallState();
      return isCallSuccess(state) && store.equipmentTotalItems() > state.data.length;
    }),

    /** The loaded linked inspections, preserved through a failed page append. */
    inspections: computed<readonly InspectionOutput[]>(() => {
      const state = store.inspectionsCallState();
      return state.data ?? [];
    }),

    /** Whether the linked-inspections fetch is in flight. */
    inspectionsLoading: computed<boolean>(() => isCallPending(store.inspectionsCallState())),

    /** The linked-inspections fetch's normalized error, or `null`. */
    inspectionsError: computed<StoreError | null>(() => store.inspectionsCallState().error),

    /** Whether the server holds more linked inspections than are loaded. */
    inspectionsHasMore: computed<boolean>(() => {
      const state = store.inspectionsCallState();
      return isCallSuccess(state) && store.inspectionsTotalItems() > state.data.length;
    }),
  })),
  withMethods(
    (
      store,
      facilityService = inject<FacilityService>(FacilityService),
      equipmentService = inject<EquipmentService>(EquipmentService),
      inspectionService = inject<InspectionService>(InspectionService),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => {
      const loadFacilities = rxMethod<{ readonly interventionId: string; readonly page: number }>(
        pipe(
          tap(({ page }) => {
            if (page === 1) patchState(store, { facilitiesCallState: pendingCallState() });
            else patchState(store, { facilitiesLoadingMore: true });
          }),
          switchMap(({ interventionId, page }) =>
            facilityService
              .listByIntervention(interventionId, {
                page,
                itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
              })
              .pipe(
                tapResponse({
                  next: (response) => {
                    const previous = page > 1 ? (store.facilitiesCallState().data ?? []) : [];
                    patchState(store, {
                      facilitiesCallState: successCallState([...previous, ...response.member]),
                      facilitiesPage: page,
                      facilitiesTotalItems: response.totalItems,
                      facilitiesLoadingMore: false,
                    });
                  },
                  error: (error: unknown) => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      facilitiesCallState: errorCallState(
                        storeError,
                        store.facilitiesCallState().data,
                      ),
                      facilitiesLoadingMore: false,
                    });
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

      const loadEquipment = rxMethod<{ readonly interventionId: string; readonly page: number }>(
        pipe(
          tap(({ page }) => {
            if (page === 1) patchState(store, { equipmentCallState: pendingCallState() });
            else patchState(store, { equipmentLoadingMore: true });
          }),
          switchMap(({ interventionId, page }) =>
            equipmentService
              .listByIntervention(interventionId, {
                page,
                itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
              })
              .pipe(
                tapResponse({
                  next: (response) => {
                    const previous = page > 1 ? (store.equipmentCallState().data ?? []) : [];
                    patchState(store, {
                      equipmentCallState: successCallState([...previous, ...response.member]),
                      equipmentPage: page,
                      equipmentTotalItems: response.totalItems,
                      equipmentLoadingMore: false,
                    });
                  },
                  error: (error: unknown) => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      equipmentCallState: errorCallState(
                        storeError,
                        store.equipmentCallState().data,
                      ),
                      equipmentLoadingMore: false,
                    });
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

      const loadInspections = rxMethod<{ readonly interventionId: string; readonly page: number }>(
        pipe(
          tap(({ page }) => {
            if (page === 1) patchState(store, { inspectionsCallState: pendingCallState() });
            else patchState(store, { inspectionsLoadingMore: true });
          }),
          switchMap(({ interventionId, page }) =>
            inspectionService
              .listByIntervention(interventionId, {
                page,
                itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
              })
              .pipe(
                tapResponse({
                  next: (response) => {
                    const previous = page > 1 ? (store.inspectionsCallState().data ?? []) : [];
                    patchState(store, {
                      inspectionsCallState: successCallState([...previous, ...response.member]),
                      inspectionsPage: page,
                      inspectionsTotalItems: response.totalItems,
                      inspectionsLoadingMore: false,
                    });
                  },
                  error: (error: unknown) => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      inspectionsCallState: errorCallState(
                        storeError,
                        store.inspectionsCallState().data,
                      ),
                      inspectionsLoadingMore: false,
                    });
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
       * Resets all three call states to idle, along with their page,
       * total-item and loading-more tracking, when the requested
       * intervention differs from the one the cache currently holds — a
       * prev/next navigation invalidates the previous intervention's cached
       * tabs without forcing an immediate refetch of tabs that stay
       * unvisited.
       */
      function resetIfDifferentIntervention(interventionId: string): void {
        if (store.loadedForInterventionId() === interventionId) return;

        patchState(store, {
          loadedForInterventionId: interventionId,
          facilitiesCallState: idleCallState(),
          facilitiesPage: 0,
          facilitiesTotalItems: 0,
          facilitiesLoadingMore: false,
          equipmentCallState: idleCallState(),
          equipmentPage: 0,
          equipmentTotalItems: 0,
          equipmentLoadingMore: false,
          inspectionsCallState: idleCallState(),
          inspectionsPage: 0,
          inspectionsTotalItems: 0,
          inspectionsLoadingMore: false,
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
          if (store.facilitiesCallState().status === 'idle') {
            loadFacilities({ interventionId, page: 1 });
          }
        },

        /**
         * Method loadMoreFacilities
         *
         * @description
         * Appends the next page of linked facilities onto the already-loaded
         * rows. A no-op while a page is already in flight; an error leaves
         * the currently loaded rows in place.
         *
         * @access public
         * @since 1.1.0
         *
         * @param {string} interventionId - The intervention shown on the page.
         *
         * @returns {void}
         */
        loadMoreFacilities(interventionId: string): void {
          if (store.facilitiesLoadingMore()) return;
          loadFacilities({ interventionId, page: store.facilitiesPage() + 1 });
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
          if (store.equipmentCallState().status === 'idle') {
            loadEquipment({ interventionId, page: 1 });
          }
        },

        /**
         * Method loadMoreEquipment
         *
         * @description
         * Appends the next page of linked equipment onto the already-loaded
         * rows. A no-op while a page is already in flight; an error leaves
         * the currently loaded rows in place.
         *
         * @access public
         * @since 1.1.0
         *
         * @param {string} interventionId - The intervention shown on the page.
         *
         * @returns {void}
         */
        loadMoreEquipment(interventionId: string): void {
          if (store.equipmentLoadingMore()) return;
          loadEquipment({ interventionId, page: store.equipmentPage() + 1 });
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
          if (store.inspectionsCallState().status === 'idle') {
            loadInspections({ interventionId, page: 1 });
          }
        },

        /**
         * Method loadMoreInspections
         *
         * @description
         * Appends the next page of linked inspections onto the
         * already-loaded rows. A no-op while a page is already in flight; an
         * error leaves the currently loaded rows in place.
         *
         * @access public
         * @since 1.1.0
         *
         * @param {string} interventionId - The intervention shown on the page.
         *
         * @returns {void}
         */
        loadMoreInspections(interventionId: string): void {
          if (store.inspectionsLoadingMore()) return;
          loadInspections({ interventionId, page: store.inspectionsPage() + 1 });
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
