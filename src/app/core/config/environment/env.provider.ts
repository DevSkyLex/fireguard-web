import { isPlatformBrowser } from '@angular/common';
import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  makeStateKey,
  PLATFORM_ID,
  TransferState,
} from '@angular/core';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { type EnvironmentConfig } from '@core/config/environment/environment-config.interface';
import { RUNTIME_ENV_CONFIG } from '@core/config/environment/runtime-env.token';

/**
 * Origins the application talks to that must never be plaintext in production.
 *
 * @constant
 */
const SECURE_ORIGIN_KEYS: ReadonlyArray<keyof EnvironmentConfig> = ['apiUrl', 'mercureHubUrl'];

/**
 * State key ENV_CONFIG_TRANSFER_KEY
 *
 * @description
 * Carries the public runtime configuration from the SSR render to hydration.
 *
 * @access private
 * @since 1.2.0
 *
 * @type {StateKey<EnvironmentConfig>}
 */
const ENV_CONFIG_TRANSFER_KEY = makeStateKey<EnvironmentConfig>('fireguard-runtime-environment');

/**
 * Function assertSecureProductionOrigins
 *
 * @description
 * Fails the bootstrap when a production build points at a non-HTTPS origin.
 * A misconfigured hosted runtime throws on first load instead of silently
 * shipping bearer tokens and session cookies in clear text. Non-production
 * builds are exempt, which keeps `localhost` usable in development.
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
      'A production runtime must target HTTPS origins.',
  );
};

/**
 * Function resolveEnvironmentConfig
 *
 * @description
 * Resolves the server runtime override or the browser hydration handoff before
 * falling back to the build configuration. Only public values enter TransferState.
 *
 * @access private
 * @since 1.2.0
 *
 * @param {EnvironmentConfig} fallback - Configuration bundled with the application.
 * @returns {EnvironmentConfig} - Configuration for the current platform.
 */
const resolveEnvironmentConfig = (fallback: EnvironmentConfig): EnvironmentConfig => {
  const platformId = inject(PLATFORM_ID);
  const transferState = inject(TransferState);
  const runtimeConfig = inject(RUNTIME_ENV_CONFIG);

  if (isPlatformBrowser(platformId)) {
    const transferred = transferState.get(ENV_CONFIG_TRANSFER_KEY, fallback);
    transferState.remove(ENV_CONFIG_TRANSFER_KEY);
    return transferred;
  }

  const resolved = runtimeConfig ?? fallback;
  transferState.set(ENV_CONFIG_TRANSFER_KEY, resolved);
  return resolved;
};

/**
 * Provider provideEnv
 *
 * @description
 * Provides the environment configuration resolved at SSR runtime and handed to
 * hydration through TransferState. Production origins are validated after resolution.
 *
 * @version 1.1.0
 *
 * @param {EnvironmentConfig} config - The environment configuration object
 *
 * @returns {EnvironmentProviders} - EnvironmentProviders for the application
 */
export const provideEnv = (config: EnvironmentConfig): EnvironmentProviders => {
  assertSecureProductionOrigins(config);

  return makeEnvironmentProviders([
    {
      provide: ENV_CONFIG,
      useFactory: (): EnvironmentConfig => {
        const resolved = resolveEnvironmentConfig(config);
        assertSecureProductionOrigins(resolved);
        return resolved;
      },
    },
  ]);
};
