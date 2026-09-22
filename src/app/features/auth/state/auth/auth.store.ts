import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  defaultIfEmpty,
  defer,
  EMPTY,
  exhaustMap,
  finalize,
  firstValueFrom,
  map,
  Observable,
  of,
  pipe,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { USER_PROFILE_PORT, type UserProfilePort } from '@features/account/ports';
import { AuthService } from '@features/auth/data-access';
import type {
  AuthenticatedLoginOutput,
  LoginInput,
  LoginOutput,
  LogoutOutput,
  MfaChallengeLoginOutput,
  MfaVerifyInput,
} from '@features/auth/models';
import { ActiveTrustedDeviceStore } from '@features/auth/state';
import {
  toResendAvailableAt,
  toResendAvailableIn,
  toResendDelaySeconds,
} from '@features/auth/utils';
import { authStoreEvents } from './events';
import type { AuthState } from './models';

/**
 * Constant TOKEN_EXPIRY_WARNING_MS
 *
 * @description
 * Time in milliseconds before token expiration to trigger warning.
 * Default: 5 minutes.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const TOKEN_EXPIRY_WARNING_MS: number = 5 * 60 * 1000;

/**
 * Constant INITIAL_AUTH_STATE
 *
 * @description
 * Initial state for the authentication store.
 * All operations start in idle state.
 *
 * @since 1.0.0
 *
 * @type {AuthState}
 */
const INITIAL_AUTH_STATE: AuthState = {
  sessionRevision: 0,
  initialized: false,
  accessToken: null,
  expiresAt: null,
  mfaRequired: false,
  mfaToken: null,
  challengeToken: null,
  mfaResendAvailableAt: null,
  loginCallState: idleCallState(),
  logoutCallState: idleCallState(),
  refreshCallState: idleCallState(),
  mfaVerifyCallState: idleCallState(),
  mfaResendCallState: idleCallState(),
} as const;

/**
 * Function calculateExpiresAt
 *
 * @description
 * Calculates the token expiration timestamp.
 *
 * @since 1.0.0
 *
 * @param {number} expiresIn - Token lifetime in seconds.
 *
 * @returns {number} Expiration timestamp in milliseconds.
 */
function calculateExpiresAt(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}

/**
 * Store AuthStore
 * @const AuthStore
 *
 * @description
 * NGRX SignalStore for authentication state management.
 * Handles login, logout, token refresh, and MFA verification.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const authStore = inject<AuthStore>(AuthStore);
 *
 * // Login
 * authStore.login({ email: 'user@example.com', password: 'password' });
 *
 * // Check authentication status
 * if (authStore.isAuthenticated()) {
 *   console.log('User is authenticated');
 * }
 *
 * // Handle MFA
 * if (authStore.mfaRequired()) {
 *   authStore.mfaVerify({ preAuthToken: authStore.mfaToken()!, code: '123456' });
 * }
 *
 * // Logout
 * authStore.logout();
 * ```
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<AuthState>(INITIAL_AUTH_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed isAuthenticated
     *
     * @description
     * Reports an established local session outside MFA. An expired bearer is
     * renewed on 401 rather than ending the session merely because time elapsed.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isAuthenticated: computed<boolean>(() => !!store.accessToken() && !store.mfaRequired()),

    /**
     * Computed isLoggingIn
     *
     * @description
     * Returns true if a login request is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isLoggingIn: computed<boolean>(() => store.loginCallState().status === 'pending'),

    /**
     * Computed isLoggingOut
     *
     * @description
     * Returns true if a logout request is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isLoggingOut: computed<boolean>(() => store.logoutCallState().status === 'pending'),

    /**
     * Computed isRefreshing
     *
     * @description
     * Returns true if a token refresh request is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isRefreshing: computed<boolean>(() => store.refreshCallState().status === 'pending'),

    /**
     * Computed isVerifyingMfa
     *
     * @description
     * Returns true if an MFA verification request is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isVerifyingMfa: computed<boolean>(() => store.mfaVerifyCallState().status === 'pending'),

    /**
     * Computed loginError
     *
     * @description
     * Returns the login operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    loginError: computed<StoreError | null>(() => store.loginCallState().error),

    /**
     * Computed mfaVerifyError
     *
     * @description
     * Returns the MFA verification operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    mfaVerifyError: computed<StoreError | null>(() => store.mfaVerifyCallState().error),

    /**
     * Computed isResendingMfa
     *
     * @description
     * Returns true if an MFA code resend request is in progress.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isResendingMfa: computed<boolean>(() => store.mfaResendCallState().status === 'pending'),

    /**
     * Computed mfaResendError
     *
     * @description
     * Returns the MFA resend operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    mfaResendError: computed<StoreError | null>(() => store.mfaResendCallState().error),

    /**
     * Computed mfaMethod
     *
     * @description
     * Returns the MFA delivery method if MFA is required.
     *
     * @since 1.0.0
     *
     * @returns {string | null}
     */
    mfaMethod: computed<string | null>(() => store.loginCallState().data?.mfa_method ?? null),

    /**
     * Computed mfaDestination
     *
     * @description
     * Returns the masked destination where the MFA code was sent.
     *
     * @since 1.0.0
     *
     * @returns {string | null}
     */
    mfaDestination: computed<string | null>(
      () => store.loginCallState().data?.mfa_destination ?? null,
    ),

    /**
     * Computed mfaResendAvailableIn
     *
     * @description
     * Whole seconds before a new MFA code may be requested, `0` when none. A
     * snapshot, not a ticking clock — the OTP form runs the countdown from it.
     *
     * @since 1.1.0
     *
     * @returns {number}
     */
    mfaResendAvailableIn: computed<number>(() => toResendAvailableIn(store.mfaResendAvailableAt())),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      authService = inject<AuthService>(AuthService),
      userProfilePort = inject<UserProfilePort>(USER_PROFILE_PORT),
      activeTrustedDeviceStore = inject<ActiveTrustedDeviceStore>(ActiveTrustedDeviceStore),
      destroyRef = inject(DestroyRef),
    ) => {
      /**
       * In-flight session renewal, shared by every concurrent caller.
       *
       * Held outside the returned methods so a burst of parallel 401s resolves
       * against one refresh rather than racing several against a rotating token.
       */
      let renewal: Observable<string | null> | null = null;
      const invalidated = new Subject<void>();
      const mfaInvalidated = new Subject<void>();

      /**
       * Function invalidateSession
       * @description Advances local identity before settling old token producers and renewal waiters.
       * @access private
       * @returns {void}
       */
      function invalidateSession(): void {
        patchState(store, {
          sessionRevision: store.sessionRevision() + 1,
          loginCallState: store.isLoggingIn() ? idleCallState() : store.loginCallState(),
          logoutCallState: store.isLoggingOut() ? idleCallState() : store.logoutCallState(),
          refreshCallState: store.isRefreshing() ? idleCallState() : store.refreshCallState(),
          mfaVerifyCallState: store.isVerifyingMfa() ? idleCallState() : store.mfaVerifyCallState(),
          mfaResendCallState: store.isResendingMfa() ? idleCallState() : store.mfaResendCallState(),
        });
        renewal = null;
        invalidated.next();
      }

      /**
       * Function renewSession
       * @description Shares one refresh per session; cancellation resolves null and cannot clear a newer memo.
       * @access private
       * @returns {Observable<string | null>} The refreshed bearer, or null for an invalidated/refused renewal.
       */
      function renewSession(): Observable<string | null> {
        if (renewal) return renewal;
        const revision = store.sessionRevision();
        const request$: Observable<string | null> = defer(() => {
          if (revision !== store.sessionRevision() || store.isLoggingOut()) return of(null);
          patchState(store, { refreshCallState: pendingCallState() });
          return authService.refresh().pipe(
            takeUntil(invalidated),
            takeUntilDestroyed(destroyRef),
            map((response: AuthenticatedLoginOutput): string | null => {
              if (revision !== store.sessionRevision()) return null;
              patchState(store, {
                accessToken: response.access_token,
                expiresAt: calculateExpiresAt(response.expires_in),
                refreshCallState: successCallState(response),
              });
              return response.access_token;
            }),
            catchError((error: unknown) => {
              const failure = errorCallState<AuthenticatedLoginOutput>(toStoreError(error));
              if (revision === store.sessionRevision()) {
                patchState(store, {
                  accessToken: null,
                  expiresAt: null,
                  refreshCallState: failure,
                });
              }
              return of(null).pipe(
                finalize(() => {
                  if (revision !== store.sessionRevision()) return;
                  invalidateSession();
                  patchState(store, {
                    ...INITIAL_AUTH_STATE,
                    initialized: true,
                    sessionRevision: store.sessionRevision(),
                    refreshCallState: failure,
                  });
                  activeTrustedDeviceStore.clear();
                  userProfilePort.clear();
                  dispatcher.dispatch(authStoreEvents.sessionEnded());
                }),
              );
            }),
            defaultIfEmpty(null),
          );
        }).pipe(
          finalize(() => {
            if (renewal === request$) renewal = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
        renewal = request$;
        return request$;
      }

      /**
       * Function applySessionTokens
       *
       * @description
       * Applies an authenticated session to the store from a login-shaped
       * response: stores the access token, clears any MFA state, and bootstraps
       * the account-owned user profile. Shared by `login`, `mfaVerify`, and the
       * registration auto-login (`applySession`).
       *
       * @param {AuthenticatedLoginOutput} response - The authenticated login response.
       *
       * @returns {void}
       */
      const applySessionTokens = (response: AuthenticatedLoginOutput): void => {
        const replacingSession = !!store.accessToken();
        invalidateSession();
        userProfilePort.clear();
        if (replacingSession) dispatcher.dispatch(authStoreEvents.sessionEnded());
        patchState(store, {
          initialized: true,
          accessToken: response.access_token,
          expiresAt: calculateExpiresAt(response.expires_in),
          mfaRequired: false,
          mfaToken: null,
          challengeToken: null,
        });
        userProfilePort.load();
      };

      /** @description Replaces any previous token producer with a new, unauthenticated MFA challenge. */
      const applyMfaChallenge = (response: MfaChallengeLoginOutput): void => {
        const replacingSession = !!store.accessToken();
        invalidateSession();
        userProfilePort.clear();
        if (replacingSession) dispatcher.dispatch(authStoreEvents.sessionEnded());
        patchState(store, {
          initialized: true,
          accessToken: null,
          expiresAt: null,
          mfaRequired: true,
          mfaToken: response.mfa_token ?? null,
          challengeToken: response.challenge_token ?? null,
          mfaResendAvailableAt: toResendAvailableAt(response.mfa_resend_in),
          loginCallState: successCallState(response),
        });
      };

      return {
        /**
         * Method isTokenExpiringSoon
         * @method isTokenExpiringSoon
         * @description Evaluates bearer freshness at call time without a cached clock or SSR timer.
         * @access public
         * @since 1.0.0
         * @returns {boolean} Whether expiry is within the warning window.
         */
        isTokenExpiringSoon(): boolean {
          const expiresAt = store.expiresAt();
          return expiresAt !== null && Date.now() >= expiresAt - TOKEN_EXPIRY_WARNING_MS;
        },
        //#region Reactive Methods
        /**
         * Method login
         *
         * @description
         * Authenticates a user with email and password credentials.
         * If MFA is enabled, sets the MFA state for verification.
         *
         * @since 1.0.0
         *
         * @param {LoginInput} credentials - User credentials.
         */
        login: rxMethod<LoginInput>(
          pipe(
            exhaustMap((credentials) => {
              patchState(store, { loginCallState: pendingCallState() });
              return authService.login(credentials).pipe(
                takeUntil(invalidated),
                tapResponse({
                  next: (response: LoginOutput) => {
                    if (response.mfa_required === true) {
                      applyMfaChallenge(response);
                    } else {
                      patchState(store, { loginCallState: successCallState(response) });
                      applySessionTokens(response);
                    }
                  },
                  error: (error: unknown) => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { loginCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      authStoreEvents.loginFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to sign in'),
                      ),
                    );
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method logout
         *
         * @description
         * Terminates the current user session by revoking tokens.
         *
         * @since 1.0.0
         */
        logout: rxMethod<void>(
          pipe(
            exhaustMap(() => {
              patchState(store, { logoutCallState: pendingCallState() });
              const revision = store.sessionRevision();
              return authService.logout().pipe(
                takeUntil(invalidated),
                tapResponse({
                  next: (response: LogoutOutput) => {
                    if (revision !== store.sessionRevision()) return;
                    invalidateSession();
                    patchState(store, {
                      ...INITIAL_AUTH_STATE,
                      sessionRevision: store.sessionRevision(),
                      initialized: true,
                      logoutCallState: successCallState(response),
                    });
                    activeTrustedDeviceStore.clear();
                    // Clear user profile on logout
                    userProfilePort.clear();
                    dispatcher.dispatch(authStoreEvents.sessionEnded());
                    dispatcher.dispatch(authStoreEvents.logoutSucceeded());
                  },
                  error: (error: unknown) => {
                    if (revision !== store.sessionRevision()) return;
                    const storeError: StoreError = toStoreError(error);
                    invalidateSession();
                    patchState(store, {
                      ...INITIAL_AUTH_STATE,
                      sessionRevision: store.sessionRevision(),
                      initialized: true,
                      logoutCallState: errorCallState(storeError),
                    });
                    activeTrustedDeviceStore.clear();
                    // Clear user profile even on logout error
                    userProfilePort.clear();
                    // The local session is gone either way, so downstream data must
                    // be purged here too — not only on the success branch.
                    dispatcher.dispatch(authStoreEvents.sessionEnded());
                    dispatcher.dispatch(
                      authStoreEvents.logoutFailed(
                        toStoreFailureEventPayload(storeError, 'Logout failed'),
                      ),
                    );
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method refresh
         *
         * @description
         * Refreshes the access token using the refresh token cookie.
         *
         * @since 1.0.0
         */
        refresh: rxMethod<void>(pipe(exhaustMap(() => renewSession()))),

        /**
         * Method mfaVerify
         *
         * @description
         * Verifies the MFA code to complete authentication.
         * If a device trust is pending, automatically trusts the device after successful verification.
         *
         * @since 1.0.0
         *
         * @param {MfaVerifyInput} input - MFA verification input.
         */
        mfaVerify: rxMethod<MfaVerifyInput>(
          pipe(
            exhaustMap((input) => {
              patchState(store, { mfaVerifyCallState: pendingCallState() });
              return authService.mfaVerify(input).pipe(
                takeUntil(invalidated),
                takeUntil(mfaInvalidated),
                tapResponse({
                  next: (response: AuthenticatedLoginOutput) => {
                    patchState(store, { mfaVerifyCallState: successCallState(response) });
                    applySessionTokens(response);

                    // Trust device if pending
                    if (activeTrustedDeviceStore.pendingTrustDevice()) {
                      activeTrustedDeviceStore.trustDevice();
                    }
                  },
                  error: (error: unknown) => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { mfaVerifyCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      authStoreEvents.mfaVerifyFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to verify code'),
                      ),
                    );
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method mfaResend
         *
         * @description
         * Resends the MFA verification code.
         * Updates the pre-auth token and challenge token with new values.
         *
         * @since 1.0.0
         */
        mfaResend: rxMethod<void>(
          pipe(
            tap(() => {
              patchState(store, { mfaResendCallState: pendingCallState() });
            }),
            switchMap(() => {
              const preAuthToken: string | null = store.mfaToken();

              if (!preAuthToken) {
                const storeError: StoreError = toStoreError('No MFA token found');
                patchState(store, { mfaResendCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  authStoreEvents.mfaResendFailed(
                    toStoreFailureEventPayload(storeError, 'Failed to resend code'),
                  ),
                );
                return EMPTY;
              }

              return authService.mfaResend({ preAuthToken }).pipe(
                takeUntil(invalidated),
                takeUntil(mfaInvalidated),
                tapResponse({
                  next: (response: MfaChallengeLoginOutput) => {
                    patchState(store, {
                      mfaToken: response.mfa_token ?? null,
                      challengeToken: response.challenge_token ?? null,
                      mfaResendAvailableAt: toResendAvailableAt(response.mfa_resend_in),
                      loginCallState: successCallState(response),
                      mfaResendCallState: successCallState(response),
                    });
                  },
                  error: (error: unknown) => {
                    const storeError: StoreError = toStoreError(error);
                    const retryDelay: number | null = toResendDelaySeconds(storeError);
                    patchState(store, {
                      mfaResendCallState: errorCallState(storeError),
                      ...(retryDelay !== null
                        ? { mfaResendAvailableAt: toResendAvailableAt(retryDelay) }
                        : {}),
                    });
                    dispatcher.dispatch(
                      authStoreEvents.mfaResendFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to resend code'),
                      ),
                    );
                  },
                }),
              );
            }),
          ),
        ),
        //#endregion

        /**
         * Method renewSession
         *
         * @description
         * Exchanges the `refresh_token` cookie for a fresh access token and returns
         * it, or `null` when the session cannot be renewed.
         *
         * Unlike {@link refresh}, which is fire-and-forget, this is awaitable — the
         * 401 interceptor needs to know the outcome before deciding whether to
         * retry the failed request or sign the user out.
         *
         * Concurrent callers share one request: a burst of parallel calls all
         * failing at once must not fire a burst of refreshes, which the server
         * would treat as replay and could invalidate the rotating refresh token.
         *
         * @since 1.1.0
         *
         * @returns {Observable<string | null>} The new access token, or `null`.
         */
        renewSession(): Observable<string | null> {
          return renewSession();
        },

        //#region Initialization Methods
        /**
         * Method initialize
         *
         * @description
         * Initializes the auth state by attempting to refresh the session.
         * If successful, also initializes the account-owned user profile.
         * The access token is never serialized through TransferState, so the
         * browser and SSR runtimes refresh independently.
         * Returns a Promise that resolves when initialization is complete.
         * Should be called once on app startup via APP_INITIALIZER.
         *
         * @since 1.0.0
         *
         * @returns {Promise<void>} Resolves when initialization is complete.
         */
        async initialize(): Promise<void> {
          const revision = store.sessionRevision();
          const restoring = !store.accessToken();
          const token = await firstValueFrom(renewSession());
          if (revision !== store.sessionRevision()) return;
          if (token && restoring) invalidateSession();
          patchState(store, { initialized: true });
          if (token) await userProfilePort.initialize();
        },
        //#endregion

        //#region Synchronous Methods
        /**
         * Method setToken
         *
         * @description
         * Manually sets the access token.
         * Useful for restoring session from storage.
         *
         * @since 1.0.0
         *
         * @param {string} token - The access token.
         * @param {number} expiresIn - Token lifetime in seconds.
         */
        setToken(token: string, expiresIn: number): void {
          const replacingSession = !!store.accessToken();
          invalidateSession();
          userProfilePort.clear();
          if (replacingSession) dispatcher.dispatch(authStoreEvents.sessionEnded());
          patchState(store, {
            initialized: true,
            accessToken: token,
            expiresAt: calculateExpiresAt(expiresIn),
            mfaRequired: false,
            mfaToken: null,
            challengeToken: null,
          });
        },

        /**
         * Method applySession
         *
         * @description
         * Applies an authenticated session from a login-shaped response (access
         * token + profile bootstrap). Used by flows that authenticate outside the
         * password login path, such as the registration email-verification step.
         *
         * @since 1.0.0
         *
         * @param {LoginOutput} response - The authenticated login response.
         *
         * @returns {void}
         */
        applySession(response: LoginOutput): void {
          if (response.mfa_required === true) {
            applyMfaChallenge(response);

            return;
          }

          applySessionTokens(response);
        },

        /**
         * Method clearToken
         *
         * @description
         * Ends the session locally, without calling the API.
         *
         * Used by the paths that drop a session without a logout round-trip: a 401
         * from the interceptor, and switching accounts from an invitation. Those
         * end a session just as much as `logout` does, so they dispatch
         * `sessionEnded` too — otherwise the stores and offline databases holding
         * the departing user's data survive into the next sign-in, which is the
         * exact leak `sessionEnded` exists to prevent.
         *
         * @since 1.1.0
         *
         * @fires authStoreEvents.sessionEnded
         */
        clearToken(): void {
          invalidateSession();
          activeTrustedDeviceStore.clear();
          patchState(store, {
            ...INITIAL_AUTH_STATE,
            initialized: true,
            sessionRevision: store.sessionRevision(),
            accessToken: null,
            expiresAt: null,
            mfaRequired: false,
            mfaToken: null,
            challengeToken: null,
            mfaResendAvailableAt: null,
          });
          dispatcher.dispatch(authStoreEvents.sessionEnded());
        },

        /**
         * Method clearMfaState
         *
         * @description
         * Clears the MFA pending state.
         * Useful when user cancels MFA verification.
         *
         * @since 1.0.0
         */
        clearMfaState(): void {
          mfaInvalidated.next();
          activeTrustedDeviceStore.clear();
          patchState(store, {
            mfaRequired: false,
            mfaToken: null,
            challengeToken: null,
            mfaResendAvailableAt: null,
            mfaVerifyCallState: idleCallState(),
            mfaResendCallState: idleCallState(),
          });
        },

        /**
         * Method resetOperations
         *
         * @description
         * Resets all operation states to idle.
         * Useful for clearing errors after user acknowledgment.
         *
         * @since 1.0.0
         */
        resetOperations(): void {
          patchState(store, {
            loginCallState: idleCallState(),
            logoutCallState: idleCallState(),
            refreshCallState: idleCallState(),
            mfaVerifyCallState: idleCallState(),
            mfaResendCallState: idleCallState(),
          });
        },

        /**
         * Method resetLoginOperation
         *
         * @description
         * Resets the login call state to idle.
         *
         * @since 1.0.0
         */
        resetLoginOperation(): void {
          patchState(store, {
            loginCallState: idleCallState(),
          });
        },

        /**
         * Method resetMfaVerifyOperation
         *
         * @description
         * Resets the MFA verify call state to idle.
         *
         * @since 1.0.0
         */
        resetMfaVerifyOperation(): void {
          patchState(store, {
            mfaVerifyCallState: idleCallState(),
          });
        },
        //#endregion
      };
    },
  ),
  //#endregion
);

/**
 * Type AuthStoreType
 * @type AuthStoreType
 *
 * @description
 * Type alias for the AuthStore instance.
 *
 * @since 1.0.0
 */
export type AuthStore = InstanceType<typeof AuthStore>;
