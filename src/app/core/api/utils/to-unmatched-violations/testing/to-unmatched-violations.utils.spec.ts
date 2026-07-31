import type { ConstraintViolation } from '@core/api';
import { toUnmatchedViolations } from '../to-unmatched-violations.utils';

/** Builds a 422 payload carrying the given field failures. */
const violationError = (violations: ReadonlyArray<[string, string]>): ConstraintViolation => ({
  '@id': '',
  '@type': 'ConstraintViolation',
  status: 422,
  type: 'https://tools.ietf.org/html/rfc4918#section-11.2',
  title: 'Unprocessable Entity',
  detail: 'Validation failed',
  violations: violations.map(([propertyPath, message]) => ({ propertyPath, message })),
});

describe('toUnmatchedViolations', () => {
  it('returns violations naming a field the form does not render', () => {
    const unmatched = toUnmatchedViolations(
      violationError([
        ['email', 'Already taken.'],
        ['token', 'This reset link has expired.'],
      ]),
      ['email', 'password'],
    );

    expect(unmatched).toEqual([{ propertyPath: 'token', message: 'This reset link has expired.' }]);
  });

  it('returns nothing when every violation matches a rendered field', () => {
    const unmatched = toUnmatchedViolations(violationError([['email', 'Already taken.']]), [
      'email',
    ]);

    expect(unmatched).toEqual([]);
  });

  it('returns nothing for a non-422 error', () => {
    expect(toUnmatchedViolations({ status: 500 }, ['email'])).toEqual([]);
  });
});
