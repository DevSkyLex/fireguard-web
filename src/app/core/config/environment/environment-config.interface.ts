/**
 * Interface EnvironmentConfig
 * @interface EnvironmentConfig
 *
 * @description
 * Interface used to define the environment
 * configuration.
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * export const environment: EnvironmentConfig = {
 *   production: true,
 *   apiUrl: 'http://api.smart-cafe.com/api',
 * };
 * ```
 */
export interface EnvironmentConfig {
  //#region Properties
  /**
   * Property production
   * @type {boolean}
   * @readonly
   *
   * @description
   * Whether the application is in production mode.
   *
   * @version 1.0.0
   *
   * @example
   * ```typescript
   * production: true
   * ```
   */
  readonly production: boolean;

  /**
   * Property apiUrl
   * @type {string}
   * @readonly
   *
   * @description
   * API URL of the application.
   *
   * @version 1.0.0
   *
   * @example
   * ```typescript
   * apiUrl: 'http://api.fireguard.com/api'
   * ```
   */
  readonly apiUrl: string;

  /**
   * Property appName
   * @type {string}
   * @readonly
   *
   * @description
   * Display name of the application used in page titles.
   *
   * @version 1.0.0
   *
   * @example
   * ```typescript
   * appName: 'FireGuard'
   * ```
   */
  readonly appName: string;

  /**
   * Property mercureHubUrl
   * @type {string}
   * @readonly
   *
   * @description
   * URL of the Mercure hub used for server-sent events.
   *
   * @version 1.0.0
   *
   * @example
   * ```typescript
   * mercureHubUrl: 'http://localhost:8000/.well-known/mercure'
   * ```
   */
  readonly mercureHubUrl: string;

  /**
   * Property mapStyleUrl
   * @type {string}
   * @readonly
   *
   * @description
   * MapLibre GL style URL used for the light-theme facilities map. A token-free
   * vector style (e.g. a CARTO or OpenFreeMap public style JSON).
   *
   * @version 1.0.0
   *
   * @example
   * ```typescript
   * mapStyleUrl: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
   * ```
   */
  readonly mapStyleUrl: string;

  /**
   * Property mapStyleUrlDark
   * @type {string}
   * @readonly
   *
   * @description
   * MapLibre GL style URL used for the dark-theme facilities map, swapped in when
   * the resolved application theme is dark.
   *
   * @version 1.0.0
   *
   * @example
   * ```typescript
   * mapStyleUrlDark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
   * ```
   */
  readonly mapStyleUrlDark: string;

  /**
   * Property maintenance
   * @type {boolean | undefined}
   * @readonly
   *
   * @description
   * When `true`, the application is considered to be in maintenance mode
   * at startup. The `provideMaintenanceMode()` initializer reads this flag
   * and activates the `MaintenanceStore` before any routing occurs.
   *
   * @version 1.0.0
   *
   * @example
   * ```typescript
   * maintenance: true
   * ```
   */
  readonly maintenance?: boolean;
  //#endregion
}
