import type { ConstraintViolation } from '../../models';
import { isConstraintViolation } from '../constraint-violation/constraint-violation.utils';

/**
 * Function toConstraintViolation
 *
 * @description
 * Narrows an error to a `ConstraintViolation`, looking one level in.
 *
 * The same payload reaches callers in two shapes: services rethrow it directly
 * (`HydraApiService.handleError` unwraps `HttpErrorResponse.error`), while stores
 * hand out a `StoreError` that keeps the original under `.error`. Accepting both
 * means a page can pass whichever it holds without unwrapping first.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {unknown} error - The error to narrow.
 *
 * @returns {ConstraintViolation | null} The violation payload, or `null` when the
 *   error is not a 422.
 */
export const toConstraintViolation = (error: unknown): ConstraintViolation | null => {
  if (isConstraintViolation(error)) return error;

  const wrapped: unknown = (error as { error?: unknown } | null)?.error;

  return isConstraintViolation(wrapped) ? wrapped : null;
};
