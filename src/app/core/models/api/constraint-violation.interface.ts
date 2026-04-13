import type { ApiError } from './api-error.interface';

/**
 * Interface Violation
 * @interface Violation
 *
 * @description
 * Single validation violation entry.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface Violation {
  /**
   * Property propertyPath
   * @readonly
   *
   * @description
   * Path to the property that caused the validation violation.
   * Can be nested (e.g., 'user.firstName').
   *
   * @since 1.0.0
   *
   * @type {string}
   *
   * @example 'email', 'password', 'user.firstName'
   */
  readonly propertyPath: string;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Human-readable error message explaining the validation failure.
   *
   * @since 1.0.0
   *
   * @type {string}
   *
   * @example 'This value is not a valid email address.'
   */
  readonly message: string;
}

/**
 * Interface ConstraintViolation
 * @interface ConstraintViolation
 *
 * @description
 * Validation error response with detailed violations.
 * Returned when request validation fails (HTTP 422).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const error: ConstraintViolation = {
 *   '@id': '',
 *   '@type': 'ConstraintViolation',
 *   status: 422,
 *   type: 'https://tools.ietf.org/html/rfc4918#section-11.2',
 *   title: 'Unprocessable Entity',
 *   detail: 'Validation failed',
 *   instance: null,
 *   violations: [
 *     { propertyPath: 'email', message: 'This value is not a valid email address.' },
 *     { propertyPath: 'password', message: 'This value is too short.' }
 *   ]
 * };
 * ```
 */
export interface ConstraintViolation extends ApiError {
  /**
   * Property status
   * @readonly
   *
   * @description
   * HTTP status code (always 422 Unprocessable Entity for validation errors).
   *
   * @since 1.0.0
   *
   * @type {422}
   */
  readonly status: 422;

  /**
   * Property violations
   * @readonly
   *
   * @description
   * List of validation violations with property paths and error messages.
   *
   * @since 1.0.0
   *
   * @type {readonly Violation[]}
   */
  readonly violations: readonly Violation[];
}

/**
 * Function isConstraintViolation
 *
 * @description
 * Type guard function to check if an unknown error is a ConstraintViolation.
 * Validates that status is 422 and violations array is present.
 *
 * @since 1.0.0
 *
 * @param {unknown} error - Error object to check.
 *
 * @returns {boolean} True if the error conforms to ConstraintViolation interface.
 *
 * @example
 * ```typescript
 * if (isConstraintViolation(error)) {
 *   error.violations.forEach(v => console.log(v.propertyPath, v.message));
 * }
 * ```
 */
export function isConstraintViolation(error: unknown): error is ConstraintViolation {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate: Record<string, unknown> = error as Record<string, unknown>;

  return candidate['status'] === 422 && Array.isArray(candidate['violations']);
}
