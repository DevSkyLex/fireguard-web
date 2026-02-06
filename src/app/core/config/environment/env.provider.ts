import { type EnvironmentConfig } from '@core/config/environment/environment-config.interface';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

/**
 * Provider provideEnv
 * 
 * @description
 * Helper to provide the environment 
 * configuration.
 * 
 * @version 1.0.0
 * 
 * @param {EnvironmentConfig} config - The environment configuration object
 * 
 * @returns {EnvironmentProviders} - EnvironmentProviders for the application
 */
export const provideEnv = (config: EnvironmentConfig): EnvironmentProviders => {
  // Make environment providers
  return makeEnvironmentProviders([{ 
    provide: ENV_CONFIG, 
    useValue: config
  }]);
};
