import type { ConstraintViolation, Violation } from '../../models';
import { toConstraintViolation } from '../to-constraint-violation/to-constraint-violation.utils';

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
