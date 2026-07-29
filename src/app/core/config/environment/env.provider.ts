import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { type EnvironmentConfig } from '@core/config/environment/environment-config.interface';

/**
 * Origins the application talks to that must never be plaintext in production.
 *
 * @constant
 */
const SECURE_ORIGIN_KEYS: ReadonlyArray<keyof EnvironmentConfig> = ['apiUrl', 'mercureHubUrl'];

/**
 * Function assertSecureProductionOrigins
 *
 * @description
 * Fails the bootstrap when a production build points at a non-HTTPS origin.
 * The environment file is baked in at build time, so this is deterministic: a
 * misconfigured image throws on first load instead of silently shipping bearer
 * tokens and session cookies in clear text. Non-production builds are exempt,
 * which keeps `localhost` usable in development.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {EnvironmentConfig} config - The environment configuration object
 *
 * @returns {void}
 */
const assertSecureProductionOrigins = (config: EnvironmentConfig): void => {
  if (!config.production) return;

  const insecure: ReadonlyArray<string> = SECURE_ORIGIN_KEYS.filter(
    (key: keyof EnvironmentConfig) => !String(config[key]).startsWith('https://'),
  ).map((key: keyof EnvironmentConfig) => `${key}=${String(config[key])}`);

  if (insecure.length === 0) return;

  throw new Error(
    `Insecure production environment: ${insecure.join(', ')}. ` +
      'A production build must target HTTPS origins — see src/environments/environment.ts.',
  );
};

/**
 * Provider provideEnv
 *
 * @description
 * Helper to provide the environment configuration. Validates that a production
 * build targets HTTPS origins before wiring the token.
 *
 * @version 1.1.0
 *
 * @param {EnvironmentConfig} config - The environment configuration object
 *
 * @returns {EnvironmentProviders} - EnvironmentProviders for the application
 */
export const provideEnv = (config: EnvironmentConfig): EnvironmentProviders => {
  assertSecureProductionOrigins(config);

  // Make environment providers
  return makeEnvironmentProviders([
    {
      provide: ENV_CONFIG,
      useValue: config,
    },
  ]);
};
