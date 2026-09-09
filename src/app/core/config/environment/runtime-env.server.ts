import { type EnvironmentConfig } from '@core/config/environment/environment-config.interface';

/**
 * Function readRequiredRuntimeValue
 *
 * @description
 * Reads a required public runtime variable and rejects blank values.
 *
 * @access private
 * @since 1.2.0
 *
 * @param {string} key - Process environment key.
 * @returns {string} - Trimmed variable value.
 */
const readRequiredRuntimeValue = (key: string): string => {
  const value = process.env[key]?.trim();
  if (value) return value;

  throw new Error(`Missing required runtime environment variable: ${key}.`);
};

/**
 * Function readRuntimeBoolean
 *
 * @description
 * Parses a strict boolean process variable for the public runtime contract.
 *
 * @access private
 * @since 1.2.0
 *
 * @param {string} key - Process environment key.
 * @returns {boolean} - Parsed boolean value.
 */
const readRuntimeBoolean = (key: string): boolean => {
  const value = readRequiredRuntimeValue(key).toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new Error(`Invalid boolean runtime environment variable: ${key}.`);
};

/**
 * Function readServerRuntimeEnvironment
 *
 * @description
 * Builds the public SSR runtime configuration when container runtime overrides
 * are enabled. Local Angular commands keep using the bundled configuration.
 *
 * @access public
 * @since 1.2.0
 *
 * @returns {EnvironmentConfig | null} - Runtime configuration or no override.
 */
export const readServerRuntimeEnvironment = (): EnvironmentConfig | null => {
  if (process.env['FIREGUARD_RUNTIME_CONFIG'] !== 'true') return null;

  return {
    production: true,
    apiUrl: readRequiredRuntimeValue('APP_API_URL'),
    appName: readRequiredRuntimeValue('APP_NAME'),
    mercureHubUrl: readRequiredRuntimeValue('APP_MERCURE_HUB_URL'),
    maintenance: readRuntimeBoolean('APP_MAINTENANCE'),
  };
};
