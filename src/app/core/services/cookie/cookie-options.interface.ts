/**
 * Interface CookieOptions
 * @interface CookieOptions
 *
 * @description
 * The CookieOptions interface is used to
 * define the options for a cookie.
 *
 * @version 1.0.0
 *
 * @template T - The type of the value of the cookie.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CookieOptions<T = string> {
  //#region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * The name of the cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * The value of the cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {T}
   */
  readonly value: T;

  /**
   * Property maxAge
   * @readonly
   *
   * @description
   * The max age of the cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly maxAge?: number;

  /**
   * Property expires
   * @readonly
   *
   * @description
   * The expires of the cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Date}
   */
  readonly expires?: Date;

  /**
   * Property path
   * @readonly
   *
   * @description
   * The path of the cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly path?: string;

  /**
   * Property domain
   * @readonly
   *
   * @description
   * The domain of the cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly domain?: string;

  /**
   * Property secure
   * @readonly
   *
   * @description
   * The secure of the cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly secure?: boolean;

  /**
   * Property sameSite
   * @readonly
   *
   * @description
   * The sameSite of the cookie.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {CookieSameSite}
   */
  readonly sameSite?: CookieSameSite;
  //#endregion
}

/**
 * Type CookieSameSite
 * @type {CookieSameSite}
 *
 * @description
 * The CookieSameSite type is used to
 * define the sameSite of a cookie.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type CookieSameSite = 'Strict' | 'Lax' | 'None';
