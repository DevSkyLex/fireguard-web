import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, of, pipe, switchMap, timer } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  InterventionFacilitiesTableQuery,
  InterventionEquipmentTableQuery,
  InterventionInspectionsTableQuery,
} from '@features/organization/features/interventions/models';
import { interventionLinkedResourcesStoreEvents } from './events';
import type { InterventionLinkedResourcesState } from './models';

/**
 * Constant LINKED_RESOURCES_PAGE_SIZE
 * @description Explicit canonical collection page size; endpoints remain unchanged.
 * @since 1.1.0
 * @type {number}
 */
export const LINKED_RESOURCES_PAGE_SIZE: number = 30;

/**
 * Constant INITIAL_STATE
 * @description Page-scoped linked resource caches and independent request lifecycles.
 * @since 6.2.0
 * @type {InterventionLinkedResourcesState}
 */
const INITIAL_STATE: InterventionLinkedResourcesState = {
  loadedForInterventionId: null,
  online: true,
  activeResource: null,
  facilitiesSource: 'api',
  facilitiesCallState: idleCallState(),
  facilitiesPage: 0,
  facilitiesTotalItems: 0,
  facilitiesLoadingMore: false,
  facilitiesSearch: '',
  facilitiesType: null,
  facilitiesStatus: null,
  facilitiesGeneration: 0,
  facilitiesInvalidated: false,
  facilitiesFailedPage: null,
  equipmentSource: 'api',
  equipmentCallState: idleCallState(),
  equipmentPage: 0,
  equipmentTotalItems: 0,
  equipmentLoadingMore: false,
  equipmentSearch: '',
  equipmentType: null,
  equipmentStatus: null,
  equipmentGeneration: 0,
  equipmentInvalidated: false,
  equipmentFailedPage: null,
  inspectionsSource: 'api',
  inspectionsCallState: idleCallState(),
  inspectionsPage: 0,
  inspectionsTotalItems: 0,
  inspectionsLoadingMore: false,
  inspectionsSearch: '',
  inspectionsStatus: null,
  inspectionsResult: null,
  inspectionsGeneration: 0,
  inspectionsInvalidated: false,
  inspectionsFailedPage: null,
};

/**
 * Store InterventionLinkedResourcesStore
 * @description Owns three lazy paged collections, criteria and invalidation per intervention.
 * Cancellation happens before debounce and every result is guarded by context and generation.
 * @since 6.2.0
 */
export const InterventionLinkedResourcesStore = signalStore(
  withState<InterventionLinkedResourcesState>(INITIAL_STATE),
  withComputed((store) => ({
    facilities: computed(() => store.facilitiesCallState().data ?? []),
    facilitiesLoading: computed(() => isCallPending(store.facilitiesCallState())),
    facilitiesError: computed(() => store.facilitiesCallState().error),
    facilitiesHasMore: computed(
      () => store.facilitiesTotalItems() > (store.facilitiesCallState().data?.length ?? 0),
    ),
    facilitiesQuery: computed<InterventionFacilitiesTableQuery>(() => ({
      search: store.facilitiesSearch(),
      type: store.facilitiesType(),
      status: store.facilitiesStatus(),
    })),

    equipment: computed(() => store.equipmentCallState().data ?? []),
    equipmentLoading: computed(() => isCallPending(store.equipmentCallState())),
    equipmentError: computed(() => store.equipmentCallState().error),
    equipmentHasMore: computed(
      () => store.equipmentTotalItems() > (store.equipmentCallState().data?.length ?? 0),
    ),
    equipmentQuery: computed<InterventionEquipmentTableQuery>(() => ({
      search: store.equipmentSearch(),
      type: store.equipmentType(),
      status: store.equipmentStatus(),
    })),

    inspections: computed(() => store.inspectionsCallState().data ?? []),
    inspectionsLoading: computed(() => isCallPending(store.inspectionsCallState())),
    inspectionsError: computed(() => store.inspectionsCallState().error),
    inspectionsHasMore: computed(
      () => store.inspectionsTotalItems() > (store.inspectionsCallState().data?.length ?? 0),
    ),
    inspectionsQuery: computed<InterventionInspectionsTableQuery>(() => ({
      search: store.inspectionsSearch(),
      status: store.inspectionsStatus(),
      result: store.inspectionsResult(),
    })),
  })),
  withMethods(
    (
      store,
      facilityService = inject(FacilityService),
      equipmentService = inject(EquipmentService),
      inspectionService = inject(InspectionService),
      dispatcher = inject(Dispatcher),
    ) => {
      const requestFacilities = rxMethod<{
        interventionId: string;
        criteria: InterventionFacilitiesTableQuery;
        page: number;
        generation: number;
        delay: number;
      } | null>(
        pipe(
          switchMap((request) => {
            if (!request) return EMPTY;
            const { interventionId, criteria, page, generation, delay } = request;
            const current = (): boolean =>
              store.loadedForInterventionId() === interventionId &&
              store.facilitiesGeneration() === generation;
            return (delay ? timer(delay) : of(0)).pipe(
              switchMap(() =>
                facilityService.listByIntervention(interventionId, {
                  page,
                  itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
                  ...(criteria.search.trim() ? { search: criteria.search.trim() } : {}),
                  ...(criteria.status ? { status: criteria.status } : {}),
                  ...(criteria.type ? { params: { type: criteria.type } } : {}),
                }),
              ),
              tapResponse({
                next: (response) => {
                  if (!current()) return;
                  const previous = page > 1 ? (store.facilitiesCallState().data ?? []) : [];
                  const rows = [
                    ...new Map(
                      [...previous, ...response.member].map((row) => [row.id, row]),
                    ).values(),
                  ];
                  patchState(store, {
                    facilitiesCallState: successCallState(rows),
                    facilitiesSource: 'api',
                    facilitiesPage: page,
                    facilitiesTotalItems: response.totalItems,
                    facilitiesLoadingMore: false,
                    facilitiesInvalidated: false,
                    facilitiesFailedPage: null,
                  });
                },
                error: (error: unknown) => {
                  if (!current()) return;
                  const normalized = toStoreError(error);
                  patchState(store, {
                    facilitiesCallState: errorCallState(
                      normalized,
                      store.facilitiesCallState().data,
                    ),
                    facilitiesLoadingMore: false,
                    facilitiesFailedPage: page,
                  });
                  dispatcher.dispatch(
                    interventionLinkedResourcesStoreEvents.facilitiesLoadFailed(
                      toStoreFailureEventPayload(normalized, 'Failed to load linked facilities'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      );
      /**
       * Method loadFacilities
       * @description Starts a cancellable page read while preserving existing results.
       * @since 6.2.0
       * @param {string} interventionId - Current context.
       * @param {number} page - Requested page.
       * @param {number} delay - Text-only debounce.
       * @returns {void}
       */
      function loadFacilities(interventionId: string, page: number, delay: number = 0): void {
        if (!store.online()) {
          requestFacilities(null);
          patchState(store, {
            facilitiesGeneration: store.facilitiesGeneration() + 1,
            facilitiesSource: store.facilitiesCallState().data === null ? 'unavailable' : 'memory',
            facilitiesLoadingMore: false,
            facilitiesInvalidated: true,
            facilitiesCallState: errorCallState(
              {
                ...toStoreError(null),
                message: $localize`:@@intervention.tables.linkedOffline:Linked resources cannot be queried offline. Reconnect and retry.`,
              },
              store.facilitiesCallState().data,
            ),
          });
          return;
        }
        const generation = store.facilitiesGeneration() + 1;
        patchState(store, {
          facilitiesGeneration: generation,
          facilitiesInvalidated: false,
          facilitiesFailedPage: null,
          facilitiesCallState: pendingCallState(store.facilitiesCallState().data),
          facilitiesLoadingMore: page > 1,
        });
        requestFacilities({
          interventionId,
          criteria: store.facilitiesQuery(),
          page,
          generation,
          delay,
        });
      }

      const requestEquipment = rxMethod<{
        interventionId: string;
        criteria: InterventionEquipmentTableQuery;
        page: number;
        generation: number;
        delay: number;
      } | null>(
        pipe(
          switchMap((request) => {
            if (!request) return EMPTY;
            const { interventionId, criteria, page, generation, delay } = request;
            const current = (): boolean =>
              store.loadedForInterventionId() === interventionId &&
              store.equipmentGeneration() === generation;
            return (delay ? timer(delay) : of(0)).pipe(
              switchMap(() =>
                equipmentService.listByIntervention(interventionId, {
                  page,
                  itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
                  ...(criteria.search.trim() ? { search: criteria.search.trim() } : {}),
                  ...(criteria.type || criteria.status
                    ? {
                        params: {
                          ...(criteria.type ? { type: criteria.type } : {}),
                          ...(criteria.status ? { status: criteria.status } : {}),
                        },
                      }
                    : {}),
                }),
              ),
              tapResponse({
                next: (response) => {
                  if (!current()) return;
                  const previous = page > 1 ? (store.equipmentCallState().data ?? []) : [];
                  const rows = [
                    ...new Map(
                      [...previous, ...response.member].map((row) => [row.id, row]),
                    ).values(),
                  ];
                  patchState(store, {
                    equipmentCallState: successCallState(rows),
                    equipmentSource: 'api',
                    equipmentPage: page,
                    equipmentTotalItems: response.totalItems,
                    equipmentLoadingMore: false,
                    equipmentInvalidated: false,
                    equipmentFailedPage: null,
                  });
                },
                error: (error: unknown) => {
                  if (!current()) return;
                  const normalized = toStoreError(error);
                  patchState(store, {
                    equipmentCallState: errorCallState(normalized, store.equipmentCallState().data),
                    equipmentLoadingMore: false,
                    equipmentFailedPage: page,
                  });
                  dispatcher.dispatch(
                    interventionLinkedResourcesStoreEvents.equipmentLoadFailed(
                      toStoreFailureEventPayload(normalized, 'Failed to load linked equipment'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      );
      /**
       * Method loadEquipment
       * @description Starts a cancellable page read while preserving existing results.
       * @since 6.2.0
       * @param {string} interventionId - Current context.
       * @param {number} page - Requested page.
       * @param {number} delay - Text-only debounce.
       * @returns {void}
       */
      function loadEquipment(interventionId: string, page: number, delay: number = 0): void {
        if (!store.online()) {
          requestEquipment(null);
          patchState(store, {
            equipmentGeneration: store.equipmentGeneration() + 1,
            equipmentSource: store.equipmentCallState().data === null ? 'unavailable' : 'memory',
            equipmentLoadingMore: false,
            equipmentInvalidated: true,
            equipmentCallState: errorCallState(
              {
                ...toStoreError(null),
                message: $localize`:@@intervention.tables.linkedOffline:Linked resources cannot be queried offline. Reconnect and retry.`,
              },
              store.equipmentCallState().data,
            ),
          });
          return;
        }
        const generation = store.equipmentGeneration() + 1;
        patchState(store, {
          equipmentGeneration: generation,
          equipmentInvalidated: false,
          equipmentFailedPage: null,
          equipmentCallState: pendingCallState(store.equipmentCallState().data),
          equipmentLoadingMore: page > 1,
        });
        requestEquipment({
          interventionId,
          criteria: store.equipmentQuery(),
          page,
          generation,
          delay,
        });
      }

      const requestInspections = rxMethod<{
        interventionId: string;
        criteria: InterventionInspectionsTableQuery;
        page: number;
        generation: number;
        delay: number;
      } | null>(
        pipe(
          switchMap((request) => {
            if (!request) return EMPTY;
            const { interventionId, criteria, page, generation, delay } = request;
            const current = (): boolean =>
              store.loadedForInterventionId() === interventionId &&
              store.inspectionsGeneration() === generation;
            return (delay ? timer(delay) : of(0)).pipe(
              switchMap(() =>
                inspectionService.listByIntervention(interventionId, {
                  page,
                  itemsPerPage: LINKED_RESOURCES_PAGE_SIZE,
                  ...(criteria.search.trim() ? { search: criteria.search.trim() } : {}),
                  ...(criteria.status ? { status: criteria.status } : {}),
                  ...(criteria.result ? { result: criteria.result } : {}),
                }),
              ),
              tapResponse({
                next: (response) => {
                  if (!current()) return;
                  const previous = page > 1 ? (store.inspectionsCallState().data ?? []) : [];
                  const rows = [
                    ...new Map(
                      [...previous, ...response.member].map((row) => [row.id, row]),
                    ).values(),
                  ];
                  patchState(store, {
                    inspectionsCallState: successCallState(rows),
                    inspectionsSource: 'api',
                    inspectionsPage: page,
                    inspectionsTotalItems: response.totalItems,
                    inspectionsLoadingMore: false,
                    inspectionsInvalidated: false,
                    inspectionsFailedPage: null,
                  });
                },
                error: (error: unknown) => {
                  if (!current()) return;
                  const normalized = toStoreError(error);
                  patchState(store, {
                    inspectionsCallState: errorCallState(
                      normalized,
                      store.inspectionsCallState().data,
                    ),
                    inspectionsLoadingMore: false,
                    inspectionsFailedPage: page,
                  });
                  dispatcher.dispatch(
                    interventionLinkedResourcesStoreEvents.inspectionsLoadFailed(
                      toStoreFailureEventPayload(normalized, 'Failed to load linked inspections'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      );
      /**
       * Method loadInspections
       * @description Starts a cancellable page read while preserving existing results.
       * @since 6.2.0
       * @param {string} interventionId - Current context.
       * @param {number} page - Requested page.
       * @param {number} delay - Text-only debounce.
       * @returns {void}
       */
      function loadInspections(interventionId: string, page: number, delay: number = 0): void {
        if (!store.online()) {
          requestInspections(null);
          patchState(store, {
            inspectionsGeneration: store.inspectionsGeneration() + 1,
            inspectionsSource:
              store.inspectionsCallState().data === null ? 'unavailable' : 'memory',
            inspectionsLoadingMore: false,
            inspectionsInvalidated: true,
            inspectionsCallState: errorCallState(
              {
                ...toStoreError(null),
                message: $localize`:@@intervention.tables.linkedOffline:Linked resources cannot be queried offline. Reconnect and retry.`,
              },
              store.inspectionsCallState().data,
            ),
          });
          return;
        }
        const generation = store.inspectionsGeneration() + 1;
        patchState(store, {
          inspectionsGeneration: generation,
          inspectionsInvalidated: false,
          inspectionsFailedPage: null,
          inspectionsCallState: pendingCallState(store.inspectionsCallState().data),
          inspectionsLoadingMore: page > 1,
        });
        requestInspections({
          interventionId,
          criteria: store.inspectionsQuery(),
          page,
          generation,
          delay,
        });
      }

      /**
       * Method setContext
       * @description Cancels every previous collection before switching intervention.
       * @since 6.2.0
       * @param {string} interventionId - Current context.
       * @returns {void}
       */
      function setContext(interventionId: string): void {
        if (store.loadedForInterventionId() === interventionId) return;
        requestFacilities(null);
        requestEquipment(null);
        requestInspections(null);
        patchState(store, {
          ...INITIAL_STATE,
          online: store.online(),
          facilitiesSource: store.online() ? 'api' : 'unavailable',
          equipmentSource: store.online() ? 'api' : 'unavailable',
          inspectionsSource: store.online() ? 'api' : 'unavailable',
          loadedForInterventionId: interventionId,
          facilitiesGeneration: store.facilitiesGeneration() + 1,
          equipmentGeneration: store.equipmentGeneration() + 1,
          inspectionsGeneration: store.inspectionsGeneration() + 1,
        });
      }
      return {
        setContext,
        /** Keeps last available linked rows in memory; offline criteria are never evaluated locally. */
        setOnline(online: boolean): void {
          if (store.online() === online) return;
          requestFacilities(null);
          requestEquipment(null);
          requestInspections(null);
          patchState(store, {
            online,
            facilitiesSource: online
              ? store.facilitiesSource()
              : store.facilitiesCallState().data === null
                ? 'unavailable'
                : 'memory',
            equipmentSource: online
              ? store.equipmentSource()
              : store.equipmentCallState().data === null
                ? 'unavailable'
                : 'memory',
            inspectionsSource: online
              ? store.inspectionsSource()
              : store.inspectionsCallState().data === null
                ? 'unavailable'
                : 'memory',
            facilitiesGeneration: store.facilitiesGeneration() + 1,
            equipmentGeneration: store.equipmentGeneration() + 1,
            inspectionsGeneration: store.inspectionsGeneration() + 1,
            facilitiesInvalidated: store.facilitiesCallState().status !== 'idle',
            equipmentInvalidated: store.equipmentCallState().status !== 'idle',
            inspectionsInvalidated: store.inspectionsCallState().status !== 'idle',
          });
          const id = store.loadedForInterventionId();
          if (!online && id) {
            if (store.facilitiesCallState().status !== 'idle') loadFacilities(id, 1);
            if (store.equipmentCallState().status !== 'idle') loadEquipment(id, 1);
            if (store.inspectionsCallState().status !== 'idle') loadInspections(id, 1);
          }
        },
        /**
         * Method deactivate
         * @description Retains cache and criteria while another panel is active.
         * @since 6.2.0
         * @returns {void}
         */
        deactivate(): void {
          patchState(store, { activeResource: null });
        },
        /**
         * Method invalidate
         * @description Refreshes only the active affected collection and marks the others dirty.
         * @since 6.2.0
         * @param {string} interventionId - Mutation owner.
         * @param {readonly string[]} collections - Affected collections.
         * @returns {void}
         */
        invalidate(interventionId: string, collections: readonly string[]): void {
          if (store.loadedForInterventionId() !== interventionId) return;
          if (collections.includes('facilities')) {
            patchState(store, { facilitiesInvalidated: true });
            if (store.activeResource() === 'facilities') loadFacilities(interventionId, 1);
            else {
              requestFacilities(null);
              patchState(store, { facilitiesGeneration: store.facilitiesGeneration() + 1 });
            }
          }
          if (collections.includes('equipment')) {
            patchState(store, { equipmentInvalidated: true });
            if (store.activeResource() === 'equipment') loadEquipment(interventionId, 1);
            else {
              requestEquipment(null);
              patchState(store, { equipmentGeneration: store.equipmentGeneration() + 1 });
            }
          }
          if (collections.includes('inspections')) {
            patchState(store, { inspectionsInvalidated: true });
            if (store.activeResource() === 'inspections') loadInspections(interventionId, 1);
            else {
              requestInspections(null);
              patchState(store, { inspectionsGeneration: store.inspectionsGeneration() + 1 });
            }
          }
        },

        /**
         * Method queryFacilities
         * @description Accepts controlled criteria; only a changed text query waits 300 ms.
         * @since 6.2.0
         * @param {InterventionFacilitiesTableQuery & { interventionId: string }} query - Current criteria.
         * @returns {void}
         */
        queryFacilities(
          query: InterventionFacilitiesTableQuery & { interventionId: string },
        ): void {
          setContext(query.interventionId);
          const previous = store.facilitiesQuery();
          const sameFilters = previous.type === query.type && previous.status === query.status;
          const sameSearch = previous.search.trim() === query.search.trim();
          patchState(store, {
            facilitiesSearch: query.search,
            facilitiesType: query.type,
            facilitiesStatus: query.status,
          });
          if (sameFilters && sameSearch && store.facilitiesCallState().status !== 'idle') return;
          loadFacilities(
            query.interventionId,
            1,
            sameFilters && !sameSearch && query.search.trim() ? 300 : 0,
          );
        },
        /**
         * Method ensureFacilitiesLoaded
         * @description Activates the table and reuses its criteria until the intervention changes.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        ensureFacilitiesLoaded(interventionId: string): void {
          setContext(interventionId);
          patchState(store, { activeResource: 'facilities' });
          if (store.facilitiesCallState().status === 'idle' || store.facilitiesInvalidated())
            loadFacilities(interventionId, 1);
        },
        /**
         * Method refreshFacilities
         * @description Forces the first page with unchanged saved criteria.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        refreshFacilities(interventionId: string): void {
          if (store.loadedForInterventionId() === interventionId) loadFacilities(interventionId, 1);
        },
        /**
         * Method retryFacilities
         * @description Retries the failed page, retaining previous pages and criteria.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        retryFacilities(interventionId: string): void {
          if (store.loadedForInterventionId() === interventionId)
            loadFacilities(interventionId, store.facilitiesFailedPage() ?? 1);
        },
        /**
         * Method loadMoreFacilities
         * @description Appends the next page with identity deduplication and guards concurrent loads.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        loadMoreFacilities(interventionId: string): void {
          if (store.loadedForInterventionId() !== interventionId || store.facilitiesLoading())
            return;
          if (store.facilitiesHasMore()) loadFacilities(interventionId, store.facilitiesPage() + 1);
        },

        /**
         * Method queryEquipment
         * @description Accepts controlled criteria; only a changed text query waits 300 ms.
         * @since 6.2.0
         * @param {InterventionEquipmentTableQuery & { interventionId: string }} query - Current criteria.
         * @returns {void}
         */
        queryEquipment(query: InterventionEquipmentTableQuery & { interventionId: string }): void {
          setContext(query.interventionId);
          const previous = store.equipmentQuery();
          const sameFilters = previous.type === query.type && previous.status === query.status;
          const sameSearch = previous.search.trim() === query.search.trim();
          patchState(store, {
            equipmentSearch: query.search,
            equipmentType: query.type,
            equipmentStatus: query.status,
          });
          if (sameFilters && sameSearch && store.equipmentCallState().status !== 'idle') return;
          loadEquipment(
            query.interventionId,
            1,
            sameFilters && !sameSearch && query.search.trim() ? 300 : 0,
          );
        },
        /**
         * Method ensureEquipmentLoaded
         * @description Activates the table and reuses its criteria until the intervention changes.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        ensureEquipmentLoaded(interventionId: string): void {
          setContext(interventionId);
          patchState(store, { activeResource: 'equipment' });
          if (store.equipmentCallState().status === 'idle' || store.equipmentInvalidated())
            loadEquipment(interventionId, 1);
        },
        /**
         * Method refreshEquipment
         * @description Forces the first page with unchanged saved criteria.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        refreshEquipment(interventionId: string): void {
          if (store.loadedForInterventionId() === interventionId) loadEquipment(interventionId, 1);
        },
        /**
         * Method retryEquipment
         * @description Retries the failed page, retaining previous pages and criteria.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        retryEquipment(interventionId: string): void {
          if (store.loadedForInterventionId() === interventionId)
            loadEquipment(interventionId, store.equipmentFailedPage() ?? 1);
        },
        /**
         * Method loadMoreEquipment
         * @description Appends the next page with identity deduplication and guards concurrent loads.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        loadMoreEquipment(interventionId: string): void {
          if (store.loadedForInterventionId() !== interventionId || store.equipmentLoading())
            return;
          if (store.equipmentHasMore()) loadEquipment(interventionId, store.equipmentPage() + 1);
        },

        /**
         * Method queryInspections
         * @description Accepts controlled criteria; only a changed text query waits 300 ms.
         * @since 6.2.0
         * @param {InterventionInspectionsTableQuery & { interventionId: string }} query - Current criteria.
         * @returns {void}
         */
        queryInspections(
          query: InterventionInspectionsTableQuery & { interventionId: string },
        ): void {
          setContext(query.interventionId);
          const previous = store.inspectionsQuery();
          const sameFilters = previous.status === query.status && previous.result === query.result;
          const sameSearch = previous.search.trim() === query.search.trim();
          patchState(store, {
            inspectionsSearch: query.search,
            inspectionsStatus: query.status,
            inspectionsResult: query.result,
          });
          if (sameFilters && sameSearch && store.inspectionsCallState().status !== 'idle') return;
          loadInspections(
            query.interventionId,
            1,
            sameFilters && !sameSearch && query.search.trim() ? 300 : 0,
          );
        },
        /**
         * Method ensureInspectionsLoaded
         * @description Activates the table and reuses its criteria until the intervention changes.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        ensureInspectionsLoaded(interventionId: string): void {
          setContext(interventionId);
          patchState(store, { activeResource: 'inspections' });
          if (store.inspectionsCallState().status === 'idle' || store.inspectionsInvalidated())
            loadInspections(interventionId, 1);
        },
        /**
         * Method refreshInspections
         * @description Forces the first page with unchanged saved criteria.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        refreshInspections(interventionId: string): void {
          if (store.loadedForInterventionId() === interventionId)
            loadInspections(interventionId, 1);
        },
        /**
         * Method retryInspections
         * @description Retries the failed page, retaining previous pages and criteria.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        retryInspections(interventionId: string): void {
          if (store.loadedForInterventionId() === interventionId)
            loadInspections(interventionId, store.inspectionsFailedPage() ?? 1);
        },
        /**
         * Method loadMoreInspections
         * @description Appends the next page with identity deduplication and guards concurrent loads.
         * @since 6.2.0
         * @param {string} interventionId - Current context.
         * @returns {void}
         */
        loadMoreInspections(interventionId: string): void {
          if (store.loadedForInterventionId() !== interventionId || store.inspectionsLoading())
            return;
          if (store.inspectionsHasMore())
            loadInspections(interventionId, store.inspectionsPage() + 1);
        },
      };
    },
  ),
);

/**
 * Type InterventionLinkedResourcesStoreType
 * @description Injectable instance of the page-owned linked resource store.
 * @since 6.2.0
 */
export type InterventionLinkedResourcesStoreType = InstanceType<
  typeof InterventionLinkedResourcesStore
>;
