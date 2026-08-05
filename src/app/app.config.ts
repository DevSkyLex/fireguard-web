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
import { APP_ROUTES } from '@app/app.routes';
import { provideEnv } from '@core/config/environment/env.provider';
import { provideFeedback } from '@core/feedback';
import { ssrCookieForwardInterceptor } from '@core/http/interceptors/ssr-cookie-forward';
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
import { provideSpartanHlm } from '@shared/ui/utils';

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
    provideSpartanHlm(),
    provideSplashScreen(),
    provideFeedback(),
    providePageTitleStrategy(),
  ],
};
