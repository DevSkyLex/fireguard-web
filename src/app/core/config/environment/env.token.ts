import { InjectionToken } from '@angular/core';
import { type EnvironmentConfig } from '@core/config/environment/environment-config.interface';

/**
 * InjectionToken ENV_CONFIG
 * 
 * @description
 * InjectionToken used to provide the 
 * environment configuration.
 * 
 * @example
 * ```typescript
 * export const ENV_CONFIG: InjectionToken<EnvironmentConfig> = 
 *   new InjectionToken<EnvironmentConfig>('ENV_CONFIG');
 * ```
 */
export const ENV_CONFIG: InjectionToken<EnvironmentConfig> = 
  new InjectionToken<EnvironmentConfig>('ENV_CONFIG');
