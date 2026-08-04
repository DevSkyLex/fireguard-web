import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { APP_ROUTES } from '@app/app.routes';
import { provideEnv } from '@core/config/environment/env.provider';
import { provideFeedback } from '@core/feedback';
import { ssrCookieForwardInterceptor } from '@core/http/interceptors/ssr-cookie-forward';
import { FireguardTheme } from '@core/primeng';
import { providePageTitleStrategy } from '@core/routing/strategies/page-title';
import { provideSplashScreen } from '@core/splash-screen';
import { provideTheme } from '@core/theme';
import { environment } from '@env/environment';
import { provideAccountFeature } from '@features/account';
import { authInterceptor, provideAuthFeature, unauthorizedInterceptor } from '@features/auth';
import { maintenanceInterceptor } from '@features/maintenance/http/interceptors';
import { provideMaintenanceMode } from '@features/maintenance/state';
import { provideCollaborationFeature } from '@features/organization/features/collaboration/collaboration.feature';
import { provideInterventionsFeature } from '@features/organization/features/interventions/interventions.feature';

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
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
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
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideInterventionsFeature(),
    provideCollaborationFeature(),
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
      pt: {
        message: {
          host: ({ instance }): Record<string, string> => {
            const severity: string | undefined = (instance as { severity?: string }).severity;
            const interrupts: boolean = severity === 'error';

            return {
              role: interrupts ? 'alert' : 'status',
              'aria-live': interrupts ? 'assertive' : 'polite',
            };
          },
        },
      },
    }),
    MessageService,
    ConfirmationService,
    provideFeedback(),
    providePageTitleStrategy(),
  ],
};
