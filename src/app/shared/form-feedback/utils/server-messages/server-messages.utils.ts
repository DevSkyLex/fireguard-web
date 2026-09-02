import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';

/**
 * Function serverMessagesOf
 * @function serverMessagesOf
 *
 * @description
 * Everything the API said about a rejected form, as flat lines to show above
 * it: the field-level violations first (deduplicated, whether or not the
 * form maps them to a field), then — for a refusal that carries none, such as
 * a 409 plan-quota refusal — the normalized `StoreError`'s own message (a raw
 * `Error` never reaches the operator), and only then the form's generic
 * fallback. Nothing while there is no error. Pure.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {unknown} error - Whatever the write failed with, or `null` / `undefined` while nothing did.
 * @param {readonly string[]} knownFields - The fields the form already renders inline errors for.
 * @param {string} fallback - The localized generic line for a refusal that says nothing usable.
 *
 * @returns {readonly string[]} The lines to render, empty while there is no error.
 */
export function serverMessagesOf(
  error: unknown,
  knownFields: readonly string[],
  fallback: string,
): readonly string[] {
  if (error === null || error === undefined) return [];

  const combined: readonly string[] = [
    ...new Set([
      ...Object.values(toServerFieldErrors(error)),
      ...toUnmatchedViolations(error, knownFields).map((v: Violation): string => v.message),
    ]),
  ];

  if (combined.length > 0) return combined;

  const message: unknown =
    typeof error === 'object' && 'message' in error && 'retryable' in error && 'timestamp' in error
      ? (error as { message: unknown }).message
      : null;

  return [typeof message === 'string' && message.trim() !== '' ? message : fallback];
}
