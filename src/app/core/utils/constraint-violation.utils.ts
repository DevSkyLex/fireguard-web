import type { ConstraintViolation } from '@core/models/api';

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
