import type { ConstraintViolation, ServerFieldErrors } from '../../models';
import { toConstraintViolation } from '../to-constraint-violation/to-constraint-violation.utils';

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
