import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
  provideAppInitializer,
  provideEnvironmentInitializer,
  REQUEST,
} from '@angular/core';
import { BOOT_READINESS_PORT } from '@core/boot-readiness';
import { USER_PROFILE_PORT, type UserProfilePort } from '@features/account/ports';
import { AUTH_LOGOUT_PORT, AUTH_SESSION_PORT } from '@features/auth/ports';
import { AuthSessionNavigationService } from '@features/auth/services';
import { AuthStore } from '@features/auth/state';

/**
 * Function initializeAuthSessionNavigation
 * @function initializeAuthSessionNavigation
 * @description Starts auth-owned browser navigation before any logout outcome can be emitted.
 * @access private
 * @since 1.0.0
 * @returns {void}
 */
function initializeAuthSessionNavigation(): void {
  inject(AuthSessionNavigationService).start();
}

/**
 * Function initializeAuthState
 * @function initializeAuthState
 * @description Restores authentication only in browser or request-bound SSR runtimes.
 * @access private
 * @since 1.0.0
 * @returns {Promise<void> | void} Initialization completion, or nothing during prerender.
 */
function initializeAuthState(): Promise<void> | void {
  const platformId: object = inject<object>(PLATFORM_ID);
  const request: Request | null = inject<Request>(REQUEST, { optional: true });
  const canInitialize: boolean =
    isPlatformBrowser(platformId) || (isPlatformServer(platformId) && request !== null);

  if (!canInitialize) return;

  return inject(AuthStore).initialize();
}

/**
 * ProvideAuth
 *
 * Provides authentication services and initializes auth state.
 *
 * @description
 * This provider:
 * - Initializes the AuthStore on app startup (browser + SSR request)
 * - Attempts to restore the user session using the refresh token cookie
 * - Blocks app initialization until auth state is determined
 * - Skips initialization only when no browser/runtime request context is available
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideAuthFeature()
 *   ]
 * };
 * ```
 * @returns {EnvironmentProviders} Authentication providers and startup hooks.
 */
export function provideAuthFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(initializeAuthSessionNavigation),
    provideAppInitializer(initializeAuthState),
    {
      provide: AUTH_SESSION_PORT,
      useFactory: (authStore: AuthStore, userProfilePort: UserProfilePort) => ({
        sessionRevision: authStore.sessionRevision,
        accessToken: authStore.accessToken,
        isAuthenticated: authStore.isAuthenticated,
        initialized: authStore.initialized,
        clearSession: (): void => {
          authStore.clearToken();
          userProfilePort.clear();
        },
        renewSession: () => authStore.renewSession(),
      }),
      deps: [AuthStore, USER_PROFILE_PORT],
    },
    {
      provide: AUTH_LOGOUT_PORT,
      useFactory: (authStore: AuthStore) => ({
        isLoggingOut: authStore.isLoggingOut,
        logout: (): void => {
          authStore.logout();
        },
      }),
      deps: [AuthStore],
    },
    {
      provide: BOOT_READINESS_PORT,
      useFactory: (authStore: AuthStore) => ({
        initialized: authStore.initialized,
      }),
      deps: [AuthStore],
    },
  ]);
}
