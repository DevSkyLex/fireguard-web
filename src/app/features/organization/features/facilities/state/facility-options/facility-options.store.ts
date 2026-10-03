import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, Subject, switchMap, takeUntil, tap, timer } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  FacilityOption,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import {
  resolveFacilityMapCenter,
  toFacilityOption,
} from '@features/organization/features/facilities/utils';
import type { MapCoordinates } from '@shared/map';
import { facilityOptionsStoreEvents } from './events';
import type { FacilityOptionsState } from './models';

//#region Initial State
/**
 * Constant INITIAL_FACILITY_OPTIONS_STATE
 *
 * @description
 * No facilities loaded, load idle.
 *
 * @since 1.0.0
 */
const INITIAL_FACILITY_OPTIONS_STATE: FacilityOptionsState = {
  organizationId: null,
  page: 1,
  total: 0,
  search: '',
  facilities: [],
  loadCallState: idleCallState(),
};
//#endregion

/**
 * Constant FACILITY_OPTIONS_PAGE_SIZE
 *
 * @description
 * Facility records per bounded server page. Search and further pages remain
 * available regardless of the organization's total number of facilities.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const FACILITY_OPTIONS_PAGE_SIZE: number = 200;

/**
 * Constant FacilityOptionsStore
 *
 * @description
 * Component-scoped NgRx SignalStore that loads the organization's facilities
 * once for a picker — parent of a new facility, site of an equipment,
 * target of a move — and derives the `FacilityOption` list every facility
 * picker renders (name, localized type, ancestor path). It exists because
 * `FacilityStore`'s list holds one paginated page of roots and cannot double
 * as a complete option source. Secondary UI data: `ensureLoaded` is browser
 * only, never SSR.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @constant FacilityOptionsStore
 */
export const FacilityOptionsStore = signalStore(
  withState<FacilityOptionsState>(INITIAL_FACILITY_OPTIONS_STATE),
  withComputed((store) => ({
    /**
     * Property pageCount
     *
     * @description
     * Number of facility pages for the current server search.
     */
    pageCount: computed(() => Math.max(1, Math.ceil(store.total() / 200))),
    /**
     * @description
     * The facilities as picker options, in API order.
     */
    options: computed<readonly FacilityOption[]>(() => store.facilities().map(toFacilityOption)),

    /**
     * @description
     * Where a map picker should open, averaged from the located facilities.
     */
    mapCenter: computed<MapCoordinates | undefined>(() =>
      resolveFacilityMapCenter(null, store.facilities()),
    ),

    /**
     * @description
     * True while the facilities are loading.
     */
    loading: computed<boolean>(() => isCallPending(store.loadCallState())),

    /**
     * @description
     * Normalized error of the last load when it failed, otherwise `null`.
     */
    loadError: computed<StoreError | null>(() => {
      const state = store.loadCallState();

      return isCallError(state) ? state.error : null;
    }),
  })),
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      facilityService: FacilityService = inject<FacilityService>(FacilityService),
      platformId: object = inject(PLATFORM_ID),
      authSession = inject(AUTH_SESSION_PORT),
    ) => {
      const cancellation = new Subject<void>();
      let generation = 0;
      let sessionRevision = authSession.sessionRevision();

      /**
       * Function clear
       *
       * @description
       * Invalidates a picker cache and cancels its outstanding read.
       *
       * @since 1.0.0
       *
       * @returns {void}
       */
      const clear = (): void => {
        generation += 1;
        cancellation.next();
        patchState(store, INITIAL_FACILITY_OPTIONS_STATE);
      };

      /**
       * Function synchronizeSession
       *
       * @description
       * Prevents a mounted picker from reusing another session's options.
       *
       * @since 1.0.0
       *
       * @returns {void}
       */
      const synchronizeSession = (): void => {
        const revision = authSession.sessionRevision();
        if (revision !== sessionRevision || !authSession.isAuthenticated()) {
          sessionRevision = revision;
          clear();
        }
      };
      const load = rxMethod<string | { organizationId: string; page?: number; search?: string }>(
        pipe(
          switchMap((input) => {
            const {
              organizationId,
              page = 1,
              search = '',
            } = typeof input === 'string' ? { organizationId: input } : input;
            synchronizeSession();
            if (!isPlatformBrowser(platformId) || !authSession.isAuthenticated()) return EMPTY;
            if (store.organizationId() !== organizationId) cancellation.next();
            const revision = authSession.sessionRevision();
            const requestGeneration = ++generation;
            patchState(store, {
              organizationId,
              page,
              search,
              facilities: store.organizationId() === organizationId ? store.facilities() : [],
              loadCallState: pendingCallState(),
            });
            const isCurrent = (): boolean =>
              requestGeneration === generation && revision === authSession.sessionRevision();
            return facilityService
              .list(organizationId, {
                page,
                itemsPerPage: FACILITY_OPTIONS_PAGE_SIZE,
                ...(search ? { search } : {}),
              })
              .pipe(
                takeUntil(cancellation),
                tapResponse({
                  next: (response: HydraCollection<FacilityOutput>): void => {
                    if (!isCurrent()) return;
                    patchState(store, {
                      facilities: response.member,
                      total: response.totalItems,
                      loadCallState: successCallState(null),
                    });
                  },
                  error: (error: unknown): void => {
                    if (!isCurrent()) return;
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { loadCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      facilityOptionsStoreEvents.loadFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to load facility options'),
                      ),
                    );
                  },
                }),
              );
          }),
        ),
      );

      const searchOptions = rxMethod<{ organizationId: string; search: string }>(
        pipe(
          switchMap((query) =>
            timer(300).pipe(
              takeUntil(cancellation),
              tap(() => load(query)),
            ),
          ),
        ),
      );
      return {
        searchOptions,
        clear,
        synchronizeSession,

        /**
         * Method load
         * @method load
         *
         * @description
         * Fetches the organization's facilities, cancelling any in-flight request.
         *
         * @access public
         * @since 1.0.0
         *
         * @type {RxMethod<string>}
         */
        load,

        /**
         * Method ensureLoaded
         * @method ensureLoaded
         *
         * @description
         * Loads once, in the browser only — the options are secondary UI data
         * a server render must not fetch — and never twice while a load is
         * pending or already succeeded.
         *
         * @access public
         * @since 1.0.0
         *
         * @param {string} organizationId - Organization owning the facilities.
         *
         * @returns {void}
         */
        ensureLoaded(organizationId: string): void {
          if (!isPlatformBrowser(platformId)) return;

          synchronizeSession();
          const status = store.loadCallState().status;
          if (
            store.organizationId() === organizationId &&
            (status === 'pending' || status === 'success')
          )
            return;

          load(organizationId);
        },
      };
    },
  ),
  withHooks((store, authSession = inject(AUTH_SESSION_PORT)) => ({
    onInit(): void {
      effect(() => {
        authSession.sessionRevision();
        authSession.isAuthenticated();
        untracked(() => store.synchronizeSession());
      });
    },
    onDestroy(): void {
      store.clear();
    },
  })),
);

/**
 * Type FacilityOptionsStore
 *
 * @description
 * Instance type of the {@link FacilityOptionsStore} signal store.
 *
 * @since 1.0.0
 *
 * @type FacilityOptionsStore
 */
export type FacilityOptionsStore = InstanceType<typeof FacilityOptionsStore>;
