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
   * @readonly
   *
   * @description
   * Whether the application is in production mode.
   *
   * @version 1.0.0
   *
   * @type {boolean}
   *
   * @example
   * ```typescript
   * production: true
   * ```
   */
  readonly production: boolean;

  /**
   * Property apiUrl
   * @readonly
   *
   * @description
   * API URL of the application.
   *
   * @version 1.0.0
   *
   * @type {string}
   *
   * @example
   * ```typescript
   * apiUrl: 'http://api.fireguard.com/api'
   * ```
   */
  readonly apiUrl: string;

  /**
   * Property appName
   * @readonly
   *
   * @description
   * Display name of the application used in page titles.
   *
   * @version 1.0.0
   *
   * @type {string}
   *
   * @example
   * ```typescript
   * appName: 'Fireguard'
   * ```
   */
  readonly appName: string;

  /**
   * Property mercureHubUrl
   * @readonly
   *
   * @description
   * URL of the Mercure hub used for server-sent events.
   *
   * @version 1.0.0
   *
   * @type {string}
   *
   * @example
   * ```typescript
   * mercureHubUrl: 'http://localhost:8000/.well-known/mercure'
   * ```
   */
  readonly mercureHubUrl: string;

  /**
   * Property maintenance
   * @readonly
   *
   * @description
   * When `true`, the application is considered to be in maintenance mode
   * at startup. The `provideMaintenanceMode()` initializer reads this flag
   * and activates the `MaintenanceStore` before any routing occurs.
   *
   * @version 1.0.0
   *
   * @type {boolean | undefined}
   *
   * @example
   * ```typescript
   * maintenance: true
   * ```
   */
  readonly maintenance?: boolean;
  //#endregion
}
