import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
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
  type CollectionOperation,
  type Operation,
  type OperationError,
} from '../operations';
import { sessionStoreEvents } from './session.events';

/**
 * Constant INITIAL_SESSION_STATE
 *
 * @description
 * Initial state for the session store.
 *
 * @since 1.0.0
 *
 * @type {SessionState}
 */
const INITIAL_SESSION_STATE: SessionState = {
  sessions: [],
  totalSessions: 0,
  listOperation: createIdleOperation(),
  revokeOperation: createIdleOperation(),
  revokeAllOperation: createIdleOperation(),
} as const;

/**
 * Store SessionStore
 * @const SessionStore
 *
 * @description
 * NGRX SignalStore for user session management.
 * Handles listing, viewing, and revoking user sessions.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const sessionStore = inject(SessionStore);
 *
 * // Load sessions
 * sessionStore.loadSessions();
 *
 * // Revoke a specific session
 * sessionStore.revoke(sessionId);
 *
 * // Revoke all other sessions
 * sessionStore.revokeAll();
 * ```
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<SessionState>(INITIAL_SESSION_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isLoadingSessions
     *
     * @description
     * Returns true if sessions are being loaded.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isLoadingSessions: computed<boolean>(() => store.listOperation().status === 'loading'),

    /**
     * Computed isRevoking
     *
     * @description
     * Returns true if a session is being revoked.
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
     * Returns true if all sessions are being revoked.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRevokingAll: computed<boolean>(() => store.revokeAllOperation().status === 'loading'),

    /**
     * Computed listError
     *
     * @description
     * Returns the list operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {OperationError<unknown> | null}
     */
    listError: computed<OperationError<unknown> | null>(() => {
      const operation: CollectionOperation<SessionOutput, unknown> = store.listOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Computed revokeError
     *
     * @description
     * Returns the revoke operation error if any.
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
     * Returns the current session (the one making the request).
     *
     * @since 1.0.0
     *
     * @returns {SessionOutput | null}
     */
    currentSession: computed<SessionOutput | null>(() => {
      return store.sessions().find((session) => session.isCurrent) ?? null;
    }),

    /**
     * Computed otherSessions
     *
     * @description
     * Returns all sessions except the current one.
     *
     * @since 1.0.0
     *
     * @returns {ReadonlyArray<SessionOutput>}
     */
    otherSessions: computed<ReadonlyArray<SessionOutput>>(() => {
      return store.sessions().filter((session) => !session.isCurrent);
    }),

    /**
     * Computed hasOtherSessions
     *
     * @description
     * Returns true if there are other active sessions.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    hasOtherSessions: computed<boolean>(() => {
      return store.sessions().some((session) => !session.isCurrent);
    }),
  })),
  //#endregion

  //#region Methods
  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    sessionService = inject<SessionService>(SessionService),
  ) => ({
    //#region Reactive Methods
    /**
     * Method loadSessions
     *
     * @description
     * Loads the list of user sessions.
     * Uses switchMap to cancel previous requests if called multiple times.
     *
     * @since 1.0.0
     *
     * @param {PaginationOptions} [options] - Optional pagination options.
     */
    loadSessions: rxMethod<PaginationOptions | void>(
      pipe(
        tap(() => {
          patchState(store, {
            listOperation: createLoadingOperation(store.listOperation().data),
          });
        }),
        switchMap((options) =>
          sessionService.list(options ?? undefined).pipe(
            tapResponse({
              next: (response: HydraCollection<SessionOutput>) => {
                patchState(store, {
                  sessions: response.member,
                  totalSessions: response.totalItems,
                  listOperation: {
                    ...createSuccessOperation(response.member),
                    total: response.totalItems,
                  },
                });
              },
              error: (error: unknown) => {
                const operationError: OperationError<unknown> =
                  createOperationErrorFromUnknown(error);
                patchState(store, {
                  listOperation: createErrorOperation(
                    operationError,
                    store.listOperation().data,
                  ),
                });
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
    ),

    /**
     * Method revoke
     *
     * @description
     * Revokes a specific session by ID.
     * Uses exhaustMap to prevent duplicate requests.
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
                // Remove the revoked session from the list
                patchState(store, {
                  sessions: store.sessions().filter((s) => s.id !== sessionId),
                  totalSessions: store.totalSessions() - 1,
                  revokeOperation: createSuccessOperation(undefined),
                });
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
     * Revokes all sessions except the current one.
     * Uses exhaustMap to prevent duplicate requests.
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
                // Keep only the current session
                const currentSession: SessionOutput | undefined = store
                  .sessions()
                  .find((s) => s.isCurrent);
                patchState(store, {
                  sessions: currentSession ? [currentSession] : [],
                  totalSessions: currentSession ? 1 : 0,
                  revokeAllOperation: createSuccessOperation(undefined),
                });
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
     * Clears all session data.
     * Should be called on logout.
     *
     * @since 1.0.0
     */
    clear(): void {
      patchState(store, INITIAL_SESSION_STATE);
    },

    /**
     * Method resetRevokeOperation
     *
     * @description
     * Resets the revoke operation state to idle.
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
     * Resets the revoke all operation state to idle.
     *
     * @since 1.0.0
     */
    resetRevokeAllOperation(): void {
      patchState(store, {
        revokeAllOperation: createIdleOperation(),
      });
    },
    //#endregion
  })),
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
