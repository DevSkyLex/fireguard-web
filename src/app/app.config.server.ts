import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { readServerRuntimeEnvironment } from '@core/config/environment/runtime-env.server';
import { RUNTIME_ENV_CONFIG } from '@core/config/environment/runtime-env.token';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/**
 * Constant serverConfig
 *
 * @description
 * Server-only providers for SSR route handling and server runtime configuration.
 *
 * @access private
 * @since 0.1.0
 *
 * @type {ApplicationConfig}
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: RUNTIME_ENV_CONFIG,
      useFactory: readServerRuntimeEnvironment,
    },
  ],
};

/**
 * Constant config
 *
 * @description
 * Application configuration with the server-only providers required during SSR.
 *
 * @access public
 * @since 0.1.0
 */
export const config = mergeApplicationConfig(appConfig, serverConfig);
