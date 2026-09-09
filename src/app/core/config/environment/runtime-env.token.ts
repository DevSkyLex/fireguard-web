import { InjectionToken } from '@angular/core';
import { type EnvironmentConfig } from '@core/config/environment/environment-config.interface';

/**
 * InjectionToken RUNTIME_ENV_CONFIG
 *
 * @description
 * Optional server-only override for the public environment configuration.
 *
 * @since 1.2.0
 *
 * @type {InjectionToken<EnvironmentConfig | null>}
 */
export const RUNTIME_ENV_CONFIG = new InjectionToken<EnvironmentConfig | null>(
  'RUNTIME_ENV_CONFIG',
  {
    factory: (): null => null,
  },
);
