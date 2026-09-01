import type { StoreError } from '@core/request-state';

/**
 * Function storeErrorMessage
 * @function storeErrorMessage
 *
 * @description
 * Extracts the human-readable message from a normalized `StoreError`, or
 * returns `null` for anything else — including raw `HttpErrorResponse`s, whose
 * generic `message` would otherwise leak into the UI. The onboarding forms use
 * it as a display fallback when the wizard confirms a step through the store
 * and the failure arrives already normalized rather than as an HTTP error.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {unknown} error - The server error handed to the form.
 *
 * @returns {string | null} The normalized message, or `null` when the error is not a `StoreError` carrying one.
 */
export function storeErrorMessage(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  if (!('retryable' in error) || !('timestamp' in error) || !('message' in error)) return null;

  const message: string | null = (error as StoreError).message;

  return typeof message === 'string' && message.trim() !== '' ? message : null;
}
