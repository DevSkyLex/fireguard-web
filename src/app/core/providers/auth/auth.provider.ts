import { type EnvironmentProviders, makeEnvironmentProviders, provideAppInitializer, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthStore } from '@core/stores/auth';

/**
 * ProvideAuth
 * 
 * Provides authentication services and initializes auth state.
 *
 * @description
 * This provider:
 * - Initializes the AuthStore on app startup (browser only)
 * - Attempts to restore the user session using the refresh token cookie
 * - Blocks app initialization until auth state is determined
 * - Skips initialization during SSR/SSG to avoid prerendering issues
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
       * Angular platform ID for checking if running in browser.
       * 
       * Used to skip auth initialization during SSR/SSG prerendering to avoid 
       * issues with cookies and session restoration.
       * 
       * Allows static generation of pages without requiring auth state.
       * 
       * @var {object}
       */
      const platformId: object = inject<object>(PLATFORM_ID);

      // Skip during SSR/SSG prerendering
      if (!isPlatformBrowser(platformId)) return;

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
  ]);
}
