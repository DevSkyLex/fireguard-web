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
import { AUTH_LOGOUT_PORT, AUTH_SESSION_PORT, LOGOUT_PROTECTION_PORT } from '@features/auth/ports';
import { AuthSessionNavigationService, LogoutProtectionService } from '@features/auth/services';
import { AuthStore } from '@features/auth/state';

/**
 * Function initializeAuthSessionNavigation
 *
 * @description
 * Starts auth-owned browser navigation before any logout outcome can be emitted.
 *
 * @access private
 * @since 1.0.0
 *
 * @returns {void}
 *
 * @function initializeAuthSessionNavigation
 */
function initializeAuthSessionNavigation(): void {
  inject(AuthSessionNavigationService).start();
}

/**
 * Function initializeAuthState
 *
 * @description
 * Restores authentication only in browser or request-bound SSR runtimes.
 *
 * @access private
 * @since 1.0.0
 *
 * @returns {Promise<void> | void} Initialization completion, or nothing during prerender.
 *
 * @function initializeAuthState
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
 * Function provideAuthFeature
 *
 * Provides authentication services and initializes auth state.
 * @description
 * This provider:
 * - Initializes the AuthStore on app startup (browser + SSR request)
 * - Attempts to restore the user session using the refresh token cookie
 * - Blocks app initialization until auth state is determined
 * - Skips initialization only when no browser/runtime request context is available
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {EnvironmentProviders} Authentication providers and startup hooks.
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
      useFactory: (authStore: AuthStore, protection: LogoutProtectionService) => ({
        isLoggingOut: authStore.isLoggingOut,
        logout: (): void => {
          const revision = authStore.sessionRevision();
          void protection.requestLogout(
            () => authStore.logout(),
            () =>
              authStore.sessionRevision() === revision &&
              authStore.isAuthenticated() &&
              !authStore.isLoggingOut(),
          );
        },
      }),
      deps: [AuthStore, LogoutProtectionService],
    },
    {
      provide: LOGOUT_PROTECTION_PORT,
      useExisting: LogoutProtectionService,
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
