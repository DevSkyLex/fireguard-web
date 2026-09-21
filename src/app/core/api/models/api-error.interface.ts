import type { HydraItem } from './hydra-item.interface';

/**
 * Interface ApiError
 * @interface ApiError
 *
 * @description
 * Problem Details response, optionally enriched with JSON-LD metadata.
 * Plain application/problem+json responses do not carry Hydra identifiers.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const error: ApiError = {
 *   '@id': '',
 *   '@type': 'Error',
 *   status: 404,
 *   type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
 *   title: 'Not Found',
 *   detail: 'User with id 123 not found',
 *   instance: '/api/users/123'
 * };
 * ```
 */
export interface ApiError extends Partial<HydraItem> {
  /**
   * Property retryAfterSeconds
   * @readonly
   * @description Server delay before retrying a refused request; null means no deadline is known.
   * @access public
   * @since 1.0.0
   * @type {number | null}
   */
  readonly retryAfterSeconds?: number | null;

  /**
   * Property code
   * @description Stable optional application failure code, independent of the localized detail.
   * @since 1.0.0
   * @type {string}
   */
  readonly code?: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * HTTP status code of the error response.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly status: number;

  /**
   * Property type
   * @readonly
   *
   * @description
   * URI reference that identifies the problem type.
   * Usually points to RFC documentation or custom error documentation.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Short, human-readable summary of the problem type.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly title?: string;

  /**
   * Property detail
   * @readonly
   *
   * @description
   * Human-readable explanation specific to this occurrence of the problem.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly detail: string;

  /**
   * Property instance
   * @readonly
   *
   * @description
   * URI reference identifying the specific occurrence of the problem.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly instance?: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional additional description field present in some API responses.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly description?: string;
}
