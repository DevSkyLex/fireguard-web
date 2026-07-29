import type { ConstraintViolation } from '@core/api';
import { toServerFieldErrors, toUnmatchedViolations } from '../constraint-violations.utils';

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

describe('toServerFieldErrors', () => {
  it('maps each violation to the field path it names', () => {
    const errors = toServerFieldErrors(
      violationError([
        ['email', 'This value is already used.'],
        ['password', 'This password has been leaked.'],
      ]),
    );

    expect(errors).toEqual({
      email: 'This value is already used.',
      password: 'This password has been leaked.',
    });
  });

  it('accepts a StoreError wrapper as handed out by a store call state', () => {
    const storeError = {
      error: violationError([['email', 'Already taken.']]),
      message: 'Validation failed',
      code: 422,
    };

    expect(toServerFieldErrors(storeError)).toEqual({ email: 'Already taken.' });
  });

  it('keeps the first message when a field is reported twice', () => {
    const errors = toServerFieldErrors(
      violationError([
        ['password', 'Too short.'],
        ['password', 'Missing a digit.'],
      ]),
    );

    expect(errors).toEqual({ password: 'Too short.' });
  });

  it('preserves nested and collection paths verbatim', () => {
    const errors = toServerFieldErrors(
      violationError([
        ['address.postalCode', 'Unknown code.'],
        ['members[0].email', 'Invalid.'],
      ]),
    );

    expect(errors).toEqual({
      'address.postalCode': 'Unknown code.',
      'members[0].email': 'Invalid.',
    });
  });

  it.each([
    ['a transport failure', { status: 500, title: 'Server Error' }],
    ['a null error', null],
    ['an undefined error', undefined],
    ['a plain Error', new Error('boom')],
  ])('returns an empty map for %s', (_label, error) => {
    expect(toServerFieldErrors(error)).toEqual({});
  });
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
