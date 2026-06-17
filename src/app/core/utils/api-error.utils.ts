import type { ApiError } from '@core/models/api';

/**
 * Function isApiError
 *
 * @description
 * Type guard function to check if an unknown error is an ApiError.
 * Validates the presence of required fields (@type, status, detail).
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
    typeof candidate['@type'] === 'string' &&
    typeof candidate['status'] === 'number' &&
    typeof candidate['detail'] === 'string'
  );
}
