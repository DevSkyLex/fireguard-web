import { isApiError } from '@core/api/utils';
import type { FeedbackEventPayload, StoreError } from '../models';
import { errorFeedback } from './feedback-payload.utils';

/**
 * Function toStoreError
 * @function toStoreError
 *
 * @description
 * Normalizes any unknown thrown value into a `StoreError`.
 * Extracts structured details from `ApiError` instances when present;
 * falls back to the `Error` message or a generic string otherwise.
 *
 * @param error The raw thrown value caught in a `tapResponse.error` callback.
 *
 * @return A normalized `StoreError` ready to store in call state.
 */
export function toStoreError(error: unknown): StoreError {
  if (isApiError(error)) {
    return {
      error,
      message: error.detail,
      code: error.status,
      retryable: error.status >= 500,
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
 * @function toStoreFailureEventPayload
 *
 * @description
 * Maps a `StoreError` to a serializable, error-severity `FeedbackEventPayload`
 * for dispatch as a NgRx store domain failure event. The payload is picked up
 * by the app-wide feedback listener and rendered as an error toast.
 *
 * @param error The normalized `StoreError` to convert.
 * @param fallbackMessage Human-readable message to use when `error.message` is `null`.
 *
 * @return A `FeedbackEventPayload` (severity `error`) ready to dispatch.
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
