import type { ApiError } from '../../models';

/**
 * Function isApiError
 *
 * @description
 * Recognizes JSON-LD errors and plain Problem Details without discarding
 * application codes or field violations during transport normalization.
 *
 * @since 1.0.0
 *
 * @param {unknown} error - Error object to check.
 *
 * @returns {boolean} True if the error conforms to ApiError interface.
 */
export function isApiError(error: unknown): error is ApiError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate: Record<string, unknown> = error as Record<string, unknown>;

  return (
    (typeof candidate['@type'] === 'string' || typeof candidate['type'] === 'string') &&
    typeof candidate['status'] === 'number' &&
    typeof candidate['detail'] === 'string'
  );
}
