import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { map, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  isCallSuccess,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import {
  ComplianceTreeService,
  FacilityService,
} from '@features/organization/features/facilities/data-access';
import type {
  ComplianceTreeNodeOutput,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import { flattenComplianceTree } from '@features/organization/features/facilities/utils';
import { facilityMapStoreEvents } from './events';
import type { FacilityMapState, WorstFacility } from './models';

/**
 * How many of the lowest-rate located facilities the "worst sites"
 * affordance ranks.
 */
const WORST_FACILITIES_LIMIT = 5;

//#region Initial State
/**
 * Constant INITIAL_FACILITY_MAP_STATE
 * @const INITIAL_FACILITY_MAP_STATE
 *
 * @description
 * Initial state for the FacilityMapStore: no facilities loaded yet, no
 * unplaced count known.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_FACILITY_MAP_STATE: FacilityMapState = {
  mappedCallState: idleCallState(),
  unplacedCallState: idleCallState(),
  complianceCallState: idleCallState(),
  complianceVisible: false,
} as const;
//#endregion

/**
 * Store FacilityMapStore
 * @const FacilityMapStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the facilities map surface
 * (`facilities/map`): every facility with both coordinates set
 * (`hasCoordinates: true`), plus the count of facilities still missing one
 * (`hasCoordinates: false`, read from `totalItems` off a single-item page —
 * `FEATURE.md` "Unplaced facilities affordance"). `FacilityStore`'s
 * roots-only, entity-keyed shape does not fit this flat, location-scoped
 * read, so this sits beside it as its own slice (`ARCHITECTURE.md` §10.11).
 *
 * Also owns the optional compliance layer: the Compliance-owned facility
 * tree (`ComplianceTreeService.getTree`, flattened by
 * `flattenComplianceTree`) loads lazily, only once, the first time the
 * layer is switched on (`setComplianceVisible`), and joins onto
 * `mappedFacilities` by id for both the per-pin compliance bucket and the
 * "worst sites" ranking (`worstFacilities`).
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityMapStore = signalStore(
  withState<FacilityMapState>(INITIAL_FACILITY_MAP_STATE),

  withComputed((store) => ({
    /** Every located facility loaded for the map. */
    mappedFacilities: computed<readonly FacilityOutput[]>(() => {
      const state = store.mappedCallState();
      return isCallSuccess(state) ? state.data : [];
    }),

    /** True while the located-facilities request is in flight. */
    isLoadingMapped: computed<boolean>(() => isCallPending(store.mappedCallState())),

    /** True when the located-facilities request failed. */
    hasMappedError: computed<boolean>(() => isCallError(store.mappedCallState())),

    /** How many facilities in the organization have no coordinates yet. */
    unplacedCount: computed<number>(() => {
      const state = store.unplacedCallState();
      return isCallSuccess(state) ? state.data : 0;
    }),

    /** Every known compliance rate, keyed by facility id. Empty until the layer has loaded. */
    complianceMap: computed<ReadonlyMap<string, number | null>>(() => {
      const state = store.complianceCallState();
      return isCallSuccess(state) ? state.data : new Map<string, number | null>();
    }),

    /** True while the compliance tree is in flight. */
    isLoadingCompliance: computed<boolean>(() => isCallPending(store.complianceCallState())),

    /** True when loading the compliance tree failed. */
    hasComplianceError: computed<boolean>(() => isCallError(store.complianceCallState())),

    /** True once the compliance tree has been requested at least once, whatever the outcome. */
    hasLoadedCompliance: computed<boolean>(() => store.complianceCallState().status !== 'idle'),
  })),

  withComputed((store) => ({
    /**
     * The lowest-rate located facilities, most critical first, capped to
     * `WORST_FACILITIES_LIMIT`. Only facilities with a known numeric rate
     * are ranked.
     */
    worstFacilities: computed<readonly WorstFacility[]>(() => {
      const complianceMap: ReadonlyMap<string, number | null> = store.complianceMap();

      const ranked: WorstFacility[] = [];
      for (const facility of store.mappedFacilities()) {
        const rate: number | null | undefined = complianceMap.get(facility.id);
        if (rate === null || rate === undefined) continue;
        ranked.push({ facility, complianceRate: rate });
      }

      return ranked
        .toSorted((left, right) => left.complianceRate - right.complianceRate)
        .slice(0, WORST_FACILITIES_LIMIT);
    }),
  })),

  withMethods(
    (
      store,
      facilityService: FacilityService = inject<FacilityService>(FacilityService),
      complianceTreeService: ComplianceTreeService = inject<ComplianceTreeService>(
        ComplianceTreeService,
      ),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /**
       * Method loadMapped
       * @method loadMapped
       *
       * @description
       * Loads every facility with both coordinates set, consuming the full
       * server-paginated collection via `FacilityService.listAll`. Cancels
       * any in-flight request via `switchMap`.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string }>}
       */
      loadMapped: rxMethod<{ organizationId: string }>(
        pipe(
          tap((): void => {
            patchState(store, {
              mappedCallState: pendingCallState(store.mappedCallState().data ?? []),
            });
          }),
          switchMap(({ organizationId }) =>
            facilityService.listAll(organizationId, { hasCoordinates: true }).pipe(
              tapResponse({
                next: (facilities: readonly FacilityOutput[]): void => {
                  patchState(store, { mappedCallState: successCallState(facilities) });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    mappedCallState: errorCallState(storeError, store.mappedCallState().data ?? []),
                  });
                  dispatcher.dispatch(
                    facilityMapStoreEvents.mappedFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load facilities'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method loadUnplacedCount
       * @method loadUnplacedCount
       *
       * @description
       * Reads the count of facilities missing a coordinate off a single-item
       * page's `totalItems`, avoiding a second full fetch. Cancels any
       * in-flight request via `switchMap`.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string }>}
       */
      loadUnplacedCount: rxMethod<{ organizationId: string }>(
        pipe(
          tap((): void => {
            patchState(store, {
              unplacedCallState: pendingCallState(store.unplacedCallState().data ?? 0),
            });
          }),
          switchMap(({ organizationId }) =>
            facilityService.list(organizationId, { hasCoordinates: false, itemsPerPage: 1 }).pipe(
              tapResponse({
                next: (collection: HydraCollection<FacilityOutput>): void => {
                  patchState(store, {
                    unplacedCallState: successCallState(collection.totalItems),
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    unplacedCallState: errorCallState(
                      storeError,
                      store.unplacedCallState().data ?? 0,
                    ),
                  });
                  dispatcher.dispatch(
                    facilityMapStoreEvents.unplacedFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        'Failed to load the unplaced facility count',
                      ),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method setComplianceVisible
       * @method setComplianceVisible
       *
       * @description
       * Toggles the compliance layer. Loading the compliance tree is the
       * caller's responsibility (`loadCompliance`) — this only flips the
       * visibility flag the page reads to choose how it maps its markers.
       *
       * @access public
       * @since 1.1.0
       *
       * @param {boolean} visible - Whether the compliance layer is switched on.
       *
       * @returns {void}
       */
      setComplianceVisible(visible: boolean): void {
        patchState(store, { complianceVisible: visible });
      },

      /**
       * Method loadCompliance
       * @method loadCompliance
       *
       * @description
       * Loads the organization's compliance tree and flattens it into a
       * `facilityId -> complianceRate` map. Browser-only by convention of
       * its caller (the page only invokes this on user action, never on
       * init). Cancels any in-flight request via `switchMap`.
       *
       * @since 1.1.0
       *
       * @type {RxMethod<{ organizationId: string }>}
       */
      loadCompliance: rxMethod<{ organizationId: string }>(
        pipe(
          tap((): void => {
            patchState(store, {
              complianceCallState: pendingCallState(store.complianceCallState().data ?? new Map()),
            });
          }),
          switchMap(({ organizationId }) =>
            complianceTreeService.getTree(organizationId).pipe(
              map(
                (
                  collection: HydraCollection<ComplianceTreeNodeOutput>,
                ): ReadonlyMap<string, number | null> => flattenComplianceTree(collection.member),
              ),
              tapResponse({
                next: (rates: ReadonlyMap<string, number | null>): void => {
                  patchState(store, { complianceCallState: successCallState(rates) });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    complianceCallState: errorCallState(
                      storeError,
                      store.complianceCallState().data ?? new Map(),
                    ),
                  });
                  dispatcher.dispatch(
                    facilityMapStoreEvents.complianceFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load compliance data'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
    }),
  ),
);

/**
 * Type FacilityMapStore
 * @type FacilityMapStore
 *
 * @description
 * Instance type of the {@link FacilityMapStore} signal store.
 *
 * @version 1.0.0
 */
export type FacilityMapStore = InstanceType<typeof FacilityMapStore>;
