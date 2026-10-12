import { HttpErrorResponse } from '@angular/common/http';
import { getIdempotencyErrorCode, isApiError } from '@core/api/utils';
import type { FeedbackEventPayload, StoreError } from '../../models';
import { errorFeedback } from '../feedback-payload/feedback-payload.utils';

/**
 * Function toStoreError
 *
 * @description
 * Normalizes any unknown thrown value into a `StoreError`.
 * Extracts structured details from `ApiError` instances when present;
 * falls back to the `Error` message or a generic string otherwise.
 *
 * @param error The raw thrown value caught in a `tapResponse.error` callback.
 *
 * @returns A normalized `StoreError` ready to store in call state.
 *
 * @function toStoreError
 */
export function toStoreError(error: unknown): StoreError {
  const idempotencyCode = getIdempotencyErrorCode(error);
  if (isApiError(error)) {
    return {
      error,
      message: error.detail,
      code: idempotencyCode ?? error.status,
      retryable: idempotencyCode
        ? idempotencyCode === 'idempotency_in_progress'
        : error.status === 0 || error.status >= 500,
      timestamp: Date.now(),
    };
  }

  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    const detail =
      typeof body === 'object' &&
      body !== null &&
      'detail' in body &&
      typeof body.detail === 'string'
        ? body.detail
        : null;
    return {
      error,
      message:
        detail ??
        (error.status === 0
          ? $localize`:@@requestState.connectionUnavailable:The connection is unavailable. Check your network and try again.`
          : $localize`:@@requestState.requestFailed:The request could not be completed. Please try again.`),
      code: idempotencyCode ?? error.status,
      retryable: idempotencyCode
        ? idempotencyCode === 'idempotency_in_progress'
        : error.status === 0 || error.status >= 500,
      timestamp: Date.now(),
    };
  }

  return {
    error,
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    code: null,
    retryable: false,
    timestamp: Date.now(),
  };
}

/**
 * Function toStoreFailureEventPayload
 *
 * @description
 * Maps a `StoreError` to a serializable, error-severity `FeedbackEventPayload`
 * for dispatch as a NgRx store domain failure event. The payload is picked up
 * by the app-wide feedback listener and rendered as an error toast.
 *
 * @param error The normalized `StoreError` to convert.
 * @param fallbackMessage Human-readable message to use when `error.message` is `null`.
 *
 * @returns A `FeedbackEventPayload` (severity `error`) ready to dispatch.
 *
 * @function toStoreFailureEventPayload
 */
export function toStoreFailureEventPayload(
  error: StoreError,
  fallbackMessage: string,
): FeedbackEventPayload {
  return errorFeedback(error.message ?? fallbackMessage, {
    code: error.code ?? null,
    retryable: error.retryable ?? false,
    timestamp: error.timestamp ?? Date.now(),
  });
}
