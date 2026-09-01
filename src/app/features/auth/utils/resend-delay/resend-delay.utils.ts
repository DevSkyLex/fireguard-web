import type { StoreError } from '@core/request-state';

/**
 * Function toResendDelaySeconds
 *
 * @description
 * Extracts the retry delay, in seconds, from a rate-limited (429) resend
 * error. The API's 429 detail always reads "Please wait N seconds before
 * resending.", and that detail lands verbatim in `StoreError.message` — so
 * parsing it here is what recovers the delay without propagating the
 * `Retry-After` header through the transport layer, which no other call
 * needs (`FEATURE.md`, auth).
 *
 * @access public
 * @since 1.0.0
 *
 * @param {StoreError} error - The normalized resend failure.
 *
 * @returns {number | null} The delay in seconds, or `null` when the error is
 * not a parseable rate limit.
 */
export function toResendDelaySeconds(error: StoreError): number | null {
  if (error.code !== 429) return null;

  const match: RegExpExecArray | null = /(\d+)\s*second/.exec(error.message ?? '');

  return match ? Number(match[1]) : null;
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
