import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { readServerRuntimeEnvironment } from '@core/config/environment/runtime-env.server';
import { RUNTIME_ENV_CONFIG } from '@core/config/environment/runtime-env.token';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: RUNTIME_ENV_CONFIG,
      useFactory: readServerRuntimeEnvironment,
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
