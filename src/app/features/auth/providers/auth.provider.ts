import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
  provideAppInitializer,
  REQUEST,
} from '@angular/core';
import { USER_PROFILE_PORT, type UserProfilePort } from '@features/account/ports';
import { AUTH_LOGOUT_PORT, AUTH_SESSION_PORT } from '@features/auth/ports';
import { AuthStore } from '@features/auth/state';

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
 *     provideAuth()
 *   ]
 * };
 * ```
 */
export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      /**
       * Constant platformId
       * @const platformId
       *
       * @description
       * Angular platform ID for checking runtime target (browser/server).
       *
       * @var {object}
       */
      const platformId: object = inject<object>(PLATFORM_ID);
      const request: Request | null = inject<Request>(REQUEST, { optional: true });
      const canInitialize: boolean =
        isPlatformBrowser(platformId) || (isPlatformServer(platformId) && !!request);

      // Skip static prerender contexts without per-request session.
      if (!canInitialize) return;

      /**
       * Constant authStore
       * @const authStore
       *
       * @description
       * Authentication store for managing auth
       * state and session restoration.
       *
       * @var {AuthStore}
       */
      const authStore: AuthStore = inject<AuthStore>(AuthStore);

      // Initialize auth state and attempt session restoration
      return authStore.initialize();
    }),
    {
      provide: AUTH_SESSION_PORT,
      useFactory: (authStore: AuthStore, userProfilePort: UserProfilePort) => ({
        accessToken: authStore.accessToken,
        isAuthenticated: authStore.isAuthenticated,
        initialized: authStore.initialized,
        clearSession: (): void => {
          authStore.clearToken();
          userProfilePort.clear();
        },
      }),
      deps: [AuthStore, USER_PROFILE_PORT],
    },
    {
      provide: AUTH_LOGOUT_PORT,
      useFactory: (authStore: AuthStore) => ({
        isLoggingOut: authStore.isLoggingOut,
        logout: (): void => { authStore.logout(); },
      }),
      deps: [AuthStore],
    },
  ]);
}
