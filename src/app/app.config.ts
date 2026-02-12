import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from '@app/app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideEnv } from '@core/config/environment/env.provider';
import { environment } from '@env/environment';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { FireguardTheme } from '@core/themes/fireguard.theme';
import { provideTheme } from '@core/services/theme';
import { providePageTitleStrategy } from '@core/strategies/page-title/page-title-strategy.provider';
import { authInterceptor, ssrCookieForwardInterceptor, unauthorizedInterceptor } from '@core/interceptors';
import { provideAuth } from '@app/core/providers/auth';

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
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
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
