import { isApiError } from '@core/models/api';

/**
 * Interface StoreError
 *
 * @description
 * Normalized error container for async store calls.
 * Replaces the legacy `OperationError` type.
 */
export interface StoreError<TError = unknown> {
  readonly error: TError;
  readonly message: string | null;
  readonly code: string | number | null;
  readonly retryable: boolean;
  readonly timestamp: number;
}

/**
 * Interface StoreFailureEventPayload
 *
 * @description
 * Normalized payload for store domain error events.
 * Replaces the legacy `OperationFailureEventPayload` type.
 */
export interface StoreFailureEventPayload {
  readonly message: string;
  readonly code: string | number | null;
  readonly retryable: boolean;
  readonly timestamp: number;
}

/**
 * Function toStoreError
 *
 * @description
 * Normalizes any unknown error into a `StoreError`.
 * Preserves `ApiError` details when present.
 * Replaces the legacy `createOperationErrorFromUnknown`.
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
 *
 * @description
 * Maps a `StoreError` to a `StoreFailureEventPayload` for event dispatch.
 * Replaces the legacy `toOperationFailureEventPayload`.
 */
export function toStoreFailureEventPayload(
  error: StoreError,
  fallbackMessage: string,
): StoreFailureEventPayload {
  return {
    message: error.message ?? fallbackMessage,
    code: error.code ?? null,
    retryable: error.retryable ?? false,
    timestamp: error.timestamp ?? Date.now(),
  };
}
