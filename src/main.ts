import { type ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { loadBrowserRuntimeEnvironment } from '@core/config/environment/runtime-env.browser';
import { RUNTIME_ENV_CONFIG } from '@core/config/environment/runtime-env.token';
import { environment } from '@env/environment';
import { App } from './app/app.component';
import { appConfig } from './app/app.config';

/**
 * Function bootstrap
 *
 * @description
 * Resolves hosted public configuration before creating services. Local Angular
 * commands keep their bundled development configuration and require no endpoint.
 *
 * @access private
 * @since 1.2.0
 *
 * @returns {Promise<void>} - Completion of the browser bootstrap.
 */
const bootstrap = async (): Promise<void> => {
  const runtimeEnvironment = environment.production ? await loadBrowserRuntimeEnvironment() : null;
  const runtimeConfig: ApplicationConfig = {
    providers: [{ provide: RUNTIME_ENV_CONFIG, useValue: runtimeEnvironment }],
  };

  await bootstrapApplication(App, mergeApplicationConfig(appConfig, runtimeConfig));
};

bootstrap().catch((error: unknown) => {
  queueMicrotask(() => {
    throw error instanceof Error ? error : new Error(String(error));
  });
});
