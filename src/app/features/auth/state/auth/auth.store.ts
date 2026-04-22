import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/state/request-state';
import { USER_PROFILE_PORT, type UserProfilePort } from '@features/account/ports';
import { AuthService } from '@features/auth/data-access';
import type { LoginInput, LoginOutput, LogoutOutput, MfaVerifyInput } from '@features/auth/models';
import { ActiveTrustedDeviceStore } from '@features/auth/state';
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
  initialized: false,
  accessToken: null,
  expiresAt: null,
  mfaRequired: false,
  mfaToken: null,
  challengeToken: null,
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
 * const authStore = inject(AuthStore);
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
     * Returns true if the user has a valid,
     * non-expired access token.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isAuthenticated: computed<boolean>(() => {
      const token: string | null = store.accessToken();
      const expiresAt: number | null = store.expiresAt();
      const mfaRequired: boolean = store.mfaRequired();

      if (!token || mfaRequired) return false;

      if (expiresAt && Date.now() >= expiresAt) return false;

      return true;
    }),

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
     * Computed isTokenExpiringSoon
     *
     * @description
     * Returns true if the token will expire within 5 minutes.
     * Useful for proactive token refresh.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isTokenExpiringSoon: computed<boolean>(() => {
      const expiresAt: number | null = store.expiresAt();
      if (!expiresAt) return false;
      return Date.now() >= expiresAt - TOKEN_EXPIRY_WARNING_MS;
    }),

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
    ) => ({
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
          tap(() => {
            patchState(store, { loginCallState: pendingCallState() });
          }),
          exhaustMap((credentials) =>
            authService.login(credentials).pipe(
              tapResponse({
                next: (response: LoginOutput) => {
                  if (response.mfa_required) {
                    patchState(store, {
                      mfaRequired: true,
                      mfaToken: response.mfa_token ?? null,
                      challengeToken: response.challenge_token ?? null,
                      loginCallState: successCallState(response),
                    });
                  } else {
                    patchState(store, {
                      accessToken: response.access_token,
                      expiresAt: calculateExpiresAt(response.expires_in),
                      mfaRequired: false,
                      mfaToken: null,
                      challengeToken: null,
                      loginCallState: successCallState(response),
                    });
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
            ),
          ),
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
          tap(() => {
            patchState(store, { logoutCallState: pendingCallState() });
          }),
          exhaustMap(() =>
            authService.logout().pipe(
              tapResponse({
                next: (response: LogoutOutput) => {
                  patchState(store, {
                    ...INITIAL_AUTH_STATE,
                    initialized: true,
                    logoutCallState: successCallState(response),
                  });
                  activeTrustedDeviceStore.clear();
                  // Clear user profile on logout
                  userProfilePort.clear();
                  dispatcher.dispatch(authStoreEvents.logoutSucceeded());
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    ...INITIAL_AUTH_STATE,
                    initialized: true,
                    logoutCallState: errorCallState(storeError),
                  });
                  activeTrustedDeviceStore.clear();
                  // Clear user profile even on logout error
                  userProfilePort.clear();
                  dispatcher.dispatch(
                    authStoreEvents.logoutFailed(
                      toStoreFailureEventPayload(storeError, 'Logout failed'),
                    ),
                  );
                },
              }),
            ),
          ),
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
      refresh: rxMethod<void>(
        pipe(
          tap(() => {
            patchState(store, { refreshCallState: pendingCallState() });
          }),
          switchMap(() =>
            authService.refresh().pipe(
              tapResponse({
                next: (response: LoginOutput) => {
                  patchState(store, {
                    accessToken: response.access_token,
                    expiresAt: calculateExpiresAt(response.expires_in),
                    refreshCallState: successCallState(response),
                  });
                },
                error: (error: unknown) => {
                  patchState(store, {
                    accessToken: null,
                    expiresAt: null,
                    refreshCallState: errorCallState(toStoreError(error)),
                  });
                },
              }),
            ),
          ),
        ),
      ),

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
          tap(() => {
            patchState(store, { mfaVerifyCallState: pendingCallState() });
          }),
          exhaustMap((input) =>
            authService.mfaVerify(input).pipe(
              tapResponse({
                next: (response: LoginOutput) => {
                  patchState(store, {
                    accessToken: response.access_token,
                    expiresAt: calculateExpiresAt(response.expires_in),
                    mfaRequired: false,
                    mfaToken: null,
                    challengeToken: null,
                    mfaVerifyCallState: successCallState(response),
                  });

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
            ),
          ),
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
              tapResponse({
                next: (response: LoginOutput) => {
                  patchState(store, {
                    mfaToken: response.mfa_token ?? null,
                    challengeToken: response.challenge_token ?? null,
                    loginCallState: successCallState(response),
                    mfaResendCallState: successCallState(response),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { mfaResendCallState: errorCallState(storeError) });
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
        try {
          const response: LoginOutput = await firstValueFrom(authService.refresh());

          patchState(store, {
            initialized: true,
            accessToken: response.access_token,
            expiresAt: calculateExpiresAt(response.expires_in),
            refreshCallState: successCallState(response),
          });

          // Load user profile after successful refresh and wait for it during bootstrap.
          await userProfilePort.initialize();
        } catch {
          patchState(store, {
            initialized: true,
            accessToken: null,
            expiresAt: null,
          });
        }
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
        patchState(store, {
          accessToken: token,
          expiresAt: calculateExpiresAt(expiresIn),
          mfaRequired: false,
          mfaToken: null,
          challengeToken: null,
        });
      },

      /**
       * Method clearToken
       *
       * @description
       * Clears the current access token.
       * Useful for local logout without API call.
       *
       * @since 1.0.0
       */
      clearToken(): void {
        activeTrustedDeviceStore.clear();
        patchState(store, {
          accessToken: null,
          expiresAt: null,
        });
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
        activeTrustedDeviceStore.clear();
        patchState(store, {
          mfaRequired: false,
          mfaToken: null,
          challengeToken: null,
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
    }),
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
