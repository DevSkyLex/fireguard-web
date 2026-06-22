import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PrimeNG, providePrimeNG } from 'primeng/config';
import { APP_ROUTES } from '@app/app.routes';
import { provideEnv } from '@core/config/environment/env.provider';
import { ssrCookieForwardInterceptor } from '@core/http/interceptors/ssr-cookie-forward';
import { PRIMENG_FR_TRANSLATION } from '@core/i18n';
import { providePageTitleStrategy } from '@core/routing/strategies/page-title';
import { SelectivePreloadingStrategy } from '@core/routing/strategies/selective-preloading/selective-preloading.strategy';
import { provideSplashScreen } from '@core/services/splash-screen';
import { provideTheme } from '@core/services/theme';
import { FireguardTheme } from '@core/themes/fireguard.theme';
import { environment } from '@env/environment';
import { provideAccountFeature } from '@features/account';
import { authInterceptor, provideAuthFeature, unauthorizedInterceptor } from '@features/auth';
import { maintenanceInterceptor } from '@features/maintenance/http/interceptors';
import { provideMaintenanceMode } from '@features/maintenance/state';
import { provideInterventionsFeature } from '@features/organization/features/interventions';

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
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      APP_ROUTES,
      withComponentInputBinding(),
      withPreloading(SelectivePreloadingStrategy),
    ),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        // Authenticated API responses are hydrated explicitly per feature.
        includeRequestsWithAuthHeaders: false,
      }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        ssrCookieForwardInterceptor,
        authInterceptor,
        unauthorizedInterceptor,
        maintenanceInterceptor,
      ]),
    ),
    /**
     * Enables Angular service-worker only in production builds.
     *
     * Registration waits until the app is stable (or 30s max) to avoid
     * competing with initial route hydration.
     */
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    /** Intervention feature bootstrap (PWA update guard + offline safety). */
    provideInterventionsFeature(),
    provideEnv(environment),
    provideMaintenanceMode(),
    provideAuthFeature(),
    provideAccountFeature(),
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
            order: 'theme, base, primeng',
          },
        },
      },
    }),
    /**
     * Applies the French PrimeNG component translation when the active locale
     * resolves to French. Angular's `@angular/localize` handles application copy;
     * PrimeNG's internal component strings are configured separately here.
     */
    provideAppInitializer((): void => {
      if (inject(LOCALE_ID).startsWith('fr')) {
        inject(PrimeNG).setTranslation(PRIMENG_FR_TRANSLATION);
      }
    }),
    MessageService,
    ConfirmationService,
    providePageTitleStrategy(),
  ],
};
