import { type EnvironmentConfig } from '@core/config/environment/environment-config.interface';

/**
 * Function isRuntimeEnvironment
 *
 * @description
 * Validates the public runtime payload before it enters dependency injection.
 *
 * @access private
 * @since 1.2.0
 *
 * @param {unknown} value - Payload returned by the same-origin runtime endpoint.
 * @returns {value is EnvironmentConfig} - Whether the payload satisfies the public contract.
 */
const isRuntimeEnvironment = (value: unknown): value is EnvironmentConfig => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<Record<keyof EnvironmentConfig, unknown>>;

  return (
    typeof candidate.production === 'boolean' &&
    typeof candidate.apiUrl === 'string' &&
    candidate.apiUrl.trim().length > 0 &&
    typeof candidate.appName === 'string' &&
    candidate.appName.trim().length > 0 &&
    typeof candidate.mercureHubUrl === 'string' &&
    candidate.mercureHubUrl.trim().length > 0 &&
    typeof candidate.maintenance === 'boolean'
  );
};

/**
 * Function loadBrowserRuntimeEnvironment
 *
 * @description
 * Loads the hosted public configuration before Angular bootstraps. The same-origin
 * request keeps cached PWA shells bound to the environment that served them.
 *
 * @access public
 * @since 1.2.0
 *
 * @param {typeof fetch} fetchRuntimeEnvironment - Fetch implementation used to load the payload.
 * @returns {Promise<EnvironmentConfig>} - Validated hosted runtime configuration.
 */
export const loadBrowserRuntimeEnvironment = async (
  fetchRuntimeEnvironment: typeof fetch = globalThis.fetch,
): Promise<EnvironmentConfig> => {
  const response = await fetchRuntimeEnvironment('/runtime-config.json', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Unable to load runtime environment: HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isRuntimeEnvironment(payload)) {
    throw new Error('Invalid runtime environment payload.');
  }

  return payload;
};
