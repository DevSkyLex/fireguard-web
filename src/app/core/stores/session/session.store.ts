import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  removeAllEntities,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { SessionService } from '@core/services/api/session';
import type { PaginationOptions } from '@core/services/api';
import type { SessionOutput } from '@core/models/session';
import type { HydraCollection } from '@core/models/api';
import type { SessionState } from './session-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type Operation,
  type OperationError,
} from '../operations';
import { sessionStoreEvents } from './session.events';

//#region Initial State
/**
 * Constant INITIAL_SESSION_STATE
 * @const INITIAL_SESSION_STATE
 *
 * @description
 * Initial state for the SessionStore. Entity state (`sessionEntities`,
 * `sessionEntityMap`, `sessionIds`) is initialised by `withEntities`.
 * This constant only seeds the auxiliary state managed in `SessionState`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_SESSION_STATE: SessionState = {
  totalSessions: 0,
  isLoading: false,
  revokeOperation: createIdleOperation(),
  revokeAllOperation: createIdleOperation(),
} as const;
//#endregion

/**
 * Store SessionStore
 * @const SessionStore
 *
 * @description
 * Component-scoped NgRx SignalStore for user session management.
 * Handles listing, viewing, and revoking user sessions. Designed to be
 * provided at **component level** (no `providedIn: 'root'`), so each
 * consumer gets an independent instance tied to its own lifecycle.
 *
 * Entity state is managed by `withEntities<SessionOutput>({ collection:
 * 'session' })`, which provides O(1) lookups via `sessionEntityMap`
 * and keeps insertions/deletions efficient via normalized storage.
 *
 * @example
 * ```typescript
 * @Component({ providers: [SessionStore] })
 * export class SessionPage {
 *   readonly store = inject(SessionStore);
 * }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const SessionStore = signalStore(
  //#region State
  withState<SessionState>(INITIAL_SESSION_STATE),
  //#endregion

  //#region Entities
  /**
   * Feature withEntities
   *
   * @description
   * Adds NgRx entity state and entity-adapter updater functions for
   * `SessionOutput` objects keyed by their `id` field. Provides:
   * - `sessionEntities` — ordered array of all cached entities
   * - `sessionEntityMap` — `{ [id]: SessionOutput }` lookup map
   * - `sessionIds` — ordered array of entity IDs
   *
   * @since 1.0.0
   */
  withEntities({ entity: type<SessionOutput>(), collection: 'session' }),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /** Alias for sessionEntities — backward-compatible accessor. */
    sessions: computed<ReadonlyArray<SessionOutput>>(
      () => store.sessionEntities(),
    ),

    /**
     * Computed isRevoking
     *
     * @description
     * Returns true if a single-session revoke operation is in-flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRevoking: computed<boolean>(() => store.revokeOperation().status === 'loading'),

    /**
     * Computed isRevokingAll
     *
     * @description
     * Returns true if the revoke-all operation is in-flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRevokingAll: computed<boolean>(() => store.revokeAllOperation().status === 'loading'),

    /**
     * Computed revokeError
     *
     * @description
     * Returns the revoke operation error, or `null` if idle/loading/success.
     *
     * @since 1.0.0
     *
     * @returns {OperationError<unknown> | null}
     */
    revokeError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<void, unknown> = store.revokeOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Computed currentSession
     *
     * @description
     * Returns the session that owns the current browser request,
     * identified by the `isCurrent` flag set server-side.
     *
     * @since 1.0.0
     *
     * @returns {SessionOutput | null}
     */
    currentSession: computed<SessionOutput | null>(() => {
      return store.sessionEntities().find((session) => session.isCurrent) ?? null;
    }),

    /**
     * Computed otherSessions
     *
     * @description
     * Returns all sessions except the current one. Used to populate
     * the "other active sessions" list for selective revocation.
     *
     * @since 1.0.0
     *
     * @returns {ReadonlyArray<SessionOutput>}
     */
    otherSessions: computed<ReadonlyArray<SessionOutput>>(() => {
      return store.sessionEntities().filter((session) => !session.isCurrent);
    }),

    /**
     * Computed hasOtherSessions
     *
     * @description
     * Quick check whether any other active sessions exist. Drives
     * the visibility of "Revoke all other sessions" controls.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    hasOtherSessions: computed<boolean>(() => {
      return store.sessionEntities().some((session) => !session.isCurrent);
    }),
  })),
  //#endregion

  //#region Methods
  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    sessionService = inject<SessionService>(SessionService),
  ) => {
    //#region Shared Reactive Pipelines
    /**
     * Reactive pipeline loadFn
     *
     * @description
     * Shared `rxMethod` pipeline for list-loading. Uses `switchMap` so that
     * rapid successive calls (e.g. pagination changes) cancel the previous
     * in-flight request. Exposed publicly as both `load` (generic) and
     * `loadSessions` (explicit).
     *
     * @since 2.0.0
     */
    const loadFn = rxMethod<PaginationOptions | void>(
      pipe(
        tap(() => {
          patchState(store, { isLoading: true });
        }),
        switchMap((options) =>
          sessionService.list(options ?? undefined).pipe(
            tapResponse({
              next: (response: HydraCollection<SessionOutput>) => {
                patchState(store,
                  setAllEntities([...response.member], { collection: 'session' }),
                  {
                    totalSessions: response.totalItems,
                    isLoading: false,
                  },
                );
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, { isLoading: false });
                dispatcher.dispatch(
                  sessionStoreEvents.loadFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load sessions'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    );
    //#endregion

    return {
      //#region Reactive Methods
      /** @see loadFn — generic alias. */
      load: loadFn,
      /** @see loadFn — explicit alias. */
      loadSessions: loadFn,

      /**
       * Method revoke
       *
       * @description
       * Revokes a specific session by ID. Uses `exhaustMap` to prevent
       * duplicate requests while a revoke is already in-flight.
       * On success the revoked session is removed from the local entity
       * collection and `totalSessions` is decremented.
       *
       * @since 1.0.0
       *
       * @param {string} sessionId - The session ID to revoke.
       */
      revoke: rxMethod<string>(
        pipe(
          tap(() => {
            patchState(store, {
              revokeOperation: createLoadingOperation(store.revokeOperation().data),
            });
          }),
          exhaustMap((sessionId) =>
            sessionService.revoke(sessionId).pipe(
              tapResponse({
                next: () => {
                  patchState(store,
                    removeEntity(sessionId, { collection: 'session' }),
                    {
                      totalSessions: store.totalSessions() - 1,
                      revokeOperation: createSuccessOperation(undefined),
                    },
                  );
                },
                error: (error: unknown) => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    revokeOperation: createErrorOperation(
                      operationError,
                      store.revokeOperation().data,
                    ),
                  });
                  dispatcher.dispatch(
                    sessionStoreEvents.revokeFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to revoke session'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method revokeAll
       *
       * @description
       * Revokes all sessions except the current one. Uses `exhaustMap` to
       * prevent duplicate requests. On success, only the current session
       * (identified by `isCurrent`) is kept in the entity collection.
       *
       * @since 1.0.0
       */
      revokeAll: rxMethod<void>(
        pipe(
          tap(() => {
            patchState(store, {
              revokeAllOperation: createLoadingOperation(store.revokeAllOperation().data),
            });
          }),
          exhaustMap(() =>
            sessionService.revokeAll().pipe(
              tapResponse({
                next: () => {
                  const currentSession: SessionOutput | undefined = store
                    .sessionEntities()
                    .find((s) => s.isCurrent);
                  patchState(store,
                    setAllEntities(
                      currentSession ? [currentSession] : [],
                      { collection: 'session' },
                    ),
                    {
                      totalSessions: currentSession ? 1 : 0,
                      revokeAllOperation: createSuccessOperation(undefined),
                    },
                  );
                },
                error: (error: unknown) => {
                  const operationError: OperationError<unknown> =
                    createOperationErrorFromUnknown(error);
                  patchState(store, {
                    revokeAllOperation: createErrorOperation(
                      operationError,
                      store.revokeAllOperation().data,
                    ),
                  });
                  dispatcher.dispatch(
                    sessionStoreEvents.revokeAllFailed(
                      toOperationFailureEventPayload(operationError, 'Failed to revoke all sessions'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
      //#endregion

      //#region Synchronous Methods
      /**
       * Method clear
       *
       * @description
       * Resets the store to its initial state and removes all entities.
       * Should be called on logout or when the component is destroyed.
       *
       * @since 1.0.0
       */
      clear(): void {
        patchState(store,
          removeAllEntities({ collection: 'session' }),
          INITIAL_SESSION_STATE,
        );
      },

      /**
       * Method resetRevokeOperation
       *
       * @description
       * Resets the revoke operation state to idle. Useful for clearing
       * feedback messages after the user has acknowledged them.
       *
       * @since 1.0.0
       */
      resetRevokeOperation(): void {
        patchState(store, {
          revokeOperation: createIdleOperation(),
        });
      },

      /**
       * Method resetRevokeAllOperation
       *
       * @description
       * Resets the revoke-all operation state to idle.
       *
       * @since 1.0.0
       */
      resetRevokeAllOperation(): void {
        patchState(store, {
          revokeAllOperation: createIdleOperation(),
        });
      },
      //#endregion
    };
  }),
  //#endregion
);

/**
 * Type SessionStoreType
 * @type SessionStoreType
 *
 * @description
 * Type alias for the SessionStore instance.
 *
 * @since 1.0.0
 */
export type SessionStore = InstanceType<typeof SessionStore>;
