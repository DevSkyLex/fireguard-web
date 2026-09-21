import { HttpErrorResponse } from '@angular/common/http';
import { isApiError } from '@core/api/utils';
import type { StoreError } from '@core/request-state';

/**
 * Function toResendDelaySeconds
 *
 * @description
 * Reads the server's structured cooldown from a rate-limited resend error.
 * Human-readable copy does not participate in recovery decisions.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {StoreError} error - The normalized resend failure.
 *
 * @returns {number | null} The delay in seconds, or `null` when the error is
 * missing a valid rate-limit recovery contract.
 */
export function toResendDelaySeconds(error: StoreError): number | null {
  if (error.code !== 429) return null;

  const body: unknown = error.error instanceof HttpErrorResponse ? error.error.error : error.error;
  if (!isApiError(body) || body.code !== 'rate_limit_exceeded') return null;
  const seconds: number | null | undefined = body.retryAfterSeconds;
  return typeof seconds === 'number' && Number.isSafeInteger(seconds) && seconds >= 0
    ? seconds
    : null;
}

/**
 * Function toResendAvailableAt
 *
 * @description
 * Converts a relative resend delay into the absolute timestamp the store
 * keeps, so a countdown computed later stays correct however long ago the
 * response arrived.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {number | null | undefined} seconds - Delay before a resend is allowed.
 *
 * @returns {number | null} Epoch milliseconds when resending becomes possible,
 * or `null` when no delay applies.
 */
export function toResendAvailableAt(seconds: number | null | undefined): number | null {
  if (typeof seconds !== 'number' || seconds <= 0) return null;

  return Date.now() + seconds * 1000;
}

/**
 * Function toResendAvailableIn
 *
 * @description
 * Converts the stored absolute timestamp back into whole seconds remaining,
 * clamped at zero — the shape the OTP form's countdown input takes.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {number | null} availableAt - Epoch milliseconds when resending becomes possible.
 *
 * @returns {number} Whole seconds remaining, `0` when none.
 */
export function toResendAvailableIn(availableAt: number | null): number {
  if (availableAt === null) return 0;

  return Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
}
