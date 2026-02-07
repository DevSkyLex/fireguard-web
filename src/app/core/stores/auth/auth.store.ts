import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { AuthService } from '@core/services/api/auth';
import { UserStore } from '@core/stores/user';
import { TrustedDeviceStore } from '@core/stores/trusted-device';
import type { LoginInput, LoginOutput, LogoutOutput, MfaResendInput, MfaVerifyInput } from '@core/models/auth';
import type { AuthState } from './auth-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  type Operation,
  type OperationError,
} from '../operations';

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
  loginOperation: createIdleOperation(),
  logoutOperation: createIdleOperation(),
  refreshOperation: createIdleOperation(),
  mfaVerifyOperation: createIdleOperation(),
  mfaResendOperation: createIdleOperation(),
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
     * Returns true if the user has a valid, non-expired access token.
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

      if (expiresAt && Date.now() >= expiresAt) {
        return false;
      }

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
    isLoggingIn: computed<boolean>(() => store.loginOperation().status === 'loading'),

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
    isLoggingOut: computed<boolean>(() => store.logoutOperation().status === 'loading'),

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
    isRefreshing: computed<boolean>(() => store.refreshOperation().status === 'loading'),

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
    isVerifyingMfa: computed<boolean>(() => store.mfaVerifyOperation().status === 'loading'),

    /**
     * Computed loginError
     *
     * @description
     * Returns the login operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {OperationError<unknown> | null}
     */
    loginError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<LoginOutput, unknown> = store.loginOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

    /**
     * Computed mfaVerifyError
     *
     * @description
     * Returns the MFA verification operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {OperationError<unknown> | null}
     */
    mfaVerifyError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<LoginOutput, unknown> = store.mfaVerifyOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

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
    isResendingMfa: computed<boolean>(() => store.mfaResendOperation().status === 'loading'),

    /**
     * Computed mfaResendError
     *
     * @description
     * Returns the MFA resend operation error if any.
     *
     * @since 1.0.0
     *
     * @returns {OperationError<unknown> | null}
     */
    mfaResendError: computed<OperationError<unknown> | null>(() => {
      const operation: Operation<LoginOutput, unknown> = store.mfaResendOperation();
      return operation.status === 'error' ? operation.error : null;
    }),

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
    mfaMethod: computed<string | null>(() => {
      const operation: Operation<LoginOutput, unknown> = store.loginOperation();
      return operation.data?.mfa_method ?? null;
    }),

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
    mfaDestination: computed<string | null>(() => {
      const operation: Operation<LoginOutput, unknown> = store.loginOperation();
      return operation.data?.mfa_destination ?? null;
    }),
  })),
  //#endregion

  //#region Methods
  withMethods((
    store,
    authService = inject<AuthService>(AuthService),
    userStore = inject<UserStore>(UserStore),
    trustedDeviceStore = inject<TrustedDeviceStore>(TrustedDeviceStore),
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
          patchState(store, {
            loginOperation: createLoadingOperation(store.loginOperation().data),
          });
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
                    loginOperation: createSuccessOperation(response),
                  });
                }
                else {
                  patchState(store, {
                    accessToken: response.access_token,
                    expiresAt: calculateExpiresAt(response.expires_in),
                    mfaRequired: false,
                    mfaToken: null,
                    challengeToken: null,
                    loginOperation: createSuccessOperation(response),
                  });
                }
              },
              error: (error: unknown) => {
                patchState(store, {
                  loginOperation: createErrorOperation(
                    createOperationErrorFromUnknown(error),
                    store.loginOperation().data,
                  ),
                });
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
          patchState(store, {
            logoutOperation: createLoadingOperation(store.logoutOperation().data),
          });
        }),
        exhaustMap(() =>
          authService.logout().pipe(
            tapResponse({
              next: (response: LogoutOutput) => {
                patchState(store, {
                  ...INITIAL_AUTH_STATE,
                  initialized: true,
                  logoutOperation: createSuccessOperation(response),
                });
                // Clear user profile on logout
                userStore.clear();
              },
              error: (error: unknown) => {
                patchState(store, {
                  ...INITIAL_AUTH_STATE,
                  initialized: true,
                  logoutOperation: createErrorOperation(
                    createOperationErrorFromUnknown(error),
                    store.logoutOperation().data,
                  ),
                });
                // Clear user profile even on logout error
                userStore.clear();
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
          patchState(store, {
            refreshOperation: createLoadingOperation(store.refreshOperation().data),
          });
        }),
        switchMap(() =>
          authService.refresh().pipe(
            tapResponse({
              next: (response: LoginOutput) => {
                patchState(store, {
                  accessToken: response.access_token,
                  expiresAt: calculateExpiresAt(response.expires_in),
                  refreshOperation: createSuccessOperation(response),
                });
              },
              error: (error: unknown) => {
                patchState(store, {
                  accessToken: null,
                  expiresAt: null,
                  refreshOperation: createErrorOperation(
                    createOperationErrorFromUnknown(error),
                    store.refreshOperation().data,
                  ),
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
          patchState(store, {
            mfaVerifyOperation: createLoadingOperation(store.mfaVerifyOperation().data),
          });
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
                  mfaVerifyOperation: createSuccessOperation(response),
                });

                // Trust device if pending
                if (trustedDeviceStore.pendingTrustDevice()) {
                  trustedDeviceStore.trustDevice();
                }
              },
              error: (error: unknown) => {
                patchState(store, {
                  mfaVerifyOperation: createErrorOperation(
                    createOperationErrorFromUnknown(error),
                    store.mfaVerifyOperation().data,
                  ),
                });
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
          patchState(store, {
            mfaResendOperation: createLoadingOperation(store.mfaResendOperation().data),
          });
        }),
        switchMap(() => {
          const preAuthToken = store.mfaToken();
          if (!preAuthToken) {
            patchState(store, {
              mfaResendOperation: createErrorOperation(
                createOperationErrorFromUnknown('No MFA token found'),
                store.mfaResendOperation().data,
              ),
            });
            return EMPTY;
          }

          return authService.mfaResend({ preAuthToken }).pipe(
            tapResponse({
              next: (response: LoginOutput) => {
                patchState(store, {
                  mfaToken: response.mfa_token ?? null,
                  challengeToken: response.challenge_token ?? null,
                  loginOperation: createSuccessOperation(response),
                  mfaResendOperation: createSuccessOperation(response),
                });
              },
              error: (error: unknown) => {
                patchState(store, {
                  mfaResendOperation: createErrorOperation(
                    createOperationErrorFromUnknown(error),
                    store.mfaResendOperation().data,
                  ),
                });
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
     * If successful, also loads the user profile.
     * Returns a Promise that resolves when initialization is complete.
     * Should be called once on app startup via APP_INITIALIZER.
     *
     * @since 1.0.0
     *
     * @returns {Promise<void>} Resolves when initialization is complete.
     */
    async initialize(): Promise<void> {
      await firstValueFrom(
        authService.refresh().pipe(
          tapResponse({
            next: (response: LoginOutput) => {
              patchState(store, {
                initialized: true,
                accessToken: response.access_token,
                expiresAt: calculateExpiresAt(response.expires_in),
                refreshOperation: createSuccessOperation(response),
              });
              // Load user profile after successful refresh
              userStore.load();
            },
            error: () => {
              patchState(store, {
                initialized: true,
                accessToken: null,
                expiresAt: null,
              });
            },
          }),
        ),
        { defaultValue: undefined },
      );
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
        loginOperation: createIdleOperation(),
        logoutOperation: createIdleOperation(),
        refreshOperation: createIdleOperation(),
        mfaVerifyOperation: createIdleOperation(),
      });
    },

    /**
     * Method resetLoginOperation
     *
     * @description
     * Resets the login operation state to idle.
     *
     * @since 1.0.0
     */
    resetLoginOperation(): void {
      patchState(store, {
        loginOperation: createIdleOperation(),
      });
    },

    /**
     * Method resetMfaVerifyOperation
     *
     * @description
     * Resets the MFA verify operation state to idle.
     *
     * @since 1.0.0
     */
    resetMfaVerifyOperation(): void {
      patchState(store, {
        mfaVerifyOperation: createIdleOperation(),
      });
    },
    //#endregion
  })),
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
