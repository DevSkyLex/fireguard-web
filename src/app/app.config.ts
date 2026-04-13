import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { APP_ROUTES } from '@app/app.routes';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideEnv } from '@core/config/environment/env.provider';
import { environment } from '@env/environment';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { FireguardTheme } from '@core/themes/fireguard.theme';
import { provideTheme } from '@core/services/theme';
import { provideSplashScreen } from '@core/services/splash-screen';
import { authInterceptor, ssrCookieForwardInterceptor, unauthorizedInterceptor } from '@core/http/interceptors';
import { providePageTitleStrategy } from '@core/routing/strategies/page-title';
import { provideAuth } from '@features/auth/providers';

/**
 * Configuration appConfig
 * @type {ApplicationConfig}
 *
 * @description
 * This configuration is used to provide the
 * application with the necessary providers.
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideBrowserGlobalErrorListeners(),
 *     provideRouter(routes),
 *     provideClientHydration(withEventReplay())
 *   ]
 * };
 * ```
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(APP_ROUTES, withComponentInputBinding()),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        includeRequestsWithAuthHeaders: true
      })
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        ssrCookieForwardInterceptor,
        authInterceptor,
        unauthorizedInterceptor
      ])
    ),
    provideEnv(environment),
    provideAuth(),
    provideTheme(),
    provideSplashScreen(),
    providePrimeNG({
      theme: {
        preset: FireguardTheme,
        options: {
          darkMode: 'selector',
          darkModeSelector: '[data-theme="dark"]',
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng'
          }
        }
      }
    }),
    MessageService,
    providePageTitleStrategy(),
  ]
};
