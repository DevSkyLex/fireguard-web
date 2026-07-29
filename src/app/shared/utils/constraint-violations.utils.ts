import { isConstraintViolation, type ConstraintViolation, type Violation } from '@core/api';

/**
 * Field-path → server message map produced from a rejected submit.
 *
 * Keyed by the violation's `propertyPath` exactly as the API reports it.
 */
export type ServerFieldErrors = Readonly<Record<string, string>>;

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
const toConstraintViolation = (error: unknown): ConstraintViolation | null => {
  if (isConstraintViolation(error)) return error;

  const wrapped: unknown = (error as { error?: unknown } | null)?.error;

  return isConstraintViolation(wrapped) ? wrapped : null;
};

/**
 * Function toServerFieldErrors
 *
 * @description
 * Turns an RFC 7807 `ConstraintViolation` (HTTP 422) into a field-path → message
 * map a template can read directly.
 *
 * The backend is the authority on validation and reports field-level failures
 * through `violations[].propertyPath`. Without this the rejection can only surface
 * as a generic toast, leaving the user to guess which field the server refused.
 *
 * Deliberately a **pure projection** rather than a write into `control.setErrors()`:
 * Angular's `FormControlName` directive calls `updateValueAndValidity()` when it
 * binds, and `FormGroup.enable()` does the same, both of which rebuild the error
 * map from the validators and would silently drop a server-set key. Reading from a
 * signal keeps the message independent of the validator lifecycle.
 *
 * Anything that is not a 422 yields an empty map, so callers can fall back to their
 * generic error handling for transport and server faults.
 *
 * @since 1.0.0
 *
 * @param {unknown} error - The error caught from the store or service.
 *
 * @returns {ServerFieldErrors} Message per field path; empty when not a 422.
 *
 * @example
 * ```typescript
 * protected readonly serverFieldErrors = computed(() => toServerFieldErrors(this.serverError()));
 * ```
 * ```html
 * @if (serverFieldErrors()['email']; as message) { <span>{{ message }}</span> }
 * ```
 */
export function toServerFieldErrors(error: unknown): ServerFieldErrors {
  const payload: ConstraintViolation | null = toConstraintViolation(error);
  if (payload === null) return {};

  const errors: Record<string, string> = {};

  for (const violation of payload.violations) {
    // First message wins: the API lists them in constraint order, and the first is
    // the most specific reason the value was refused.
    errors[violation.propertyPath] ??= violation.message;
  }

  return errors;
}

/**
 * Function toUnmatchedViolations
 *
 * @description
 * Lists the violations whose `propertyPath` matches none of the given field names,
 * so a form can surface them at form level instead of dropping them silently.
 *
 * A payload can name something the form does not render — a routed token, a
 * server-side cross-field rule — and saying nothing about it leaves the user with
 * a form that refuses to submit for no visible reason.
 *
 * @since 1.0.0
 *
 * @param {unknown} error - The error caught from the store or service.
 * @param {readonly string[]} fieldNames - Field paths the form actually renders.
 *
 * @returns {readonly Violation[]} Violations with nowhere to go.
 */
export function toUnmatchedViolations(
  error: unknown,
  fieldNames: readonly string[],
): readonly Violation[] {
  const payload: ConstraintViolation | null = toConstraintViolation(error);
  if (payload === null) return [];

  const known: ReadonlySet<string> = new Set(fieldNames);

  return payload.violations.filter((violation: Violation) => !known.has(violation.propertyPath));
}
