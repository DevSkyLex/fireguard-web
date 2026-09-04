import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
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
import { provideOrganizationFeature } from '@features/organization';
import { provideCollaborationFeature } from '@features/organization/features/collaboration/collaboration.feature';
import { provideInterventionsFeature } from '@features/organization/features/interventions/interventions.feature';
import { provideSpartanHlm } from '@shared/ui/utils';

/**
 * Configuration appConfig
 * @type {ApplicationConfig}
 *
 * @description
 * This configuration is used to provide the
 * application with the necessary providers. Registers Angular's animation
 * engine as a no-op (`provideNoopAnimations`): nothing in this codebase
 * declares an `animations:` trigger, kept registered so a future CDK-based
 * primitive that does needs no app-wide wiring change.
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
    provideNoopAnimations(),
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
      withNoIncrementalHydration(),
    ),
    provideHttpClient(
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
    provideOrganizationFeature(),
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
