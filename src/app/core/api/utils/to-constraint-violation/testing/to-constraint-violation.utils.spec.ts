import type { ConstraintViolation } from '@core/api';
import { toConstraintViolation } from '../to-constraint-violation.utils';

/** Builds a minimal 422 payload. */
const violation = (): ConstraintViolation => ({
  '@id': '',
  '@type': 'ConstraintViolation',
  status: 422,
  type: 'https://tools.ietf.org/html/rfc4918#section-11.2',
  title: 'Unprocessable Entity',
  detail: 'Validation failed',
  violations: [{ propertyPath: 'email', message: 'Already taken.' }],
});

describe('toConstraintViolation', () => {
  it('returns a direct ConstraintViolation as-is', () => {
    const payload = violation();

    expect(toConstraintViolation(payload)).toBe(payload);
  });

  it('unwraps a StoreError-style wrapper holding the payload under .error', () => {
    const payload = violation();

    expect(toConstraintViolation({ error: payload, message: 'Validation failed' })).toBe(payload);
  });

  it('returns null for anything that is not a 422 payload, wrapped or not', () => {
    expect(toConstraintViolation({ status: 500, title: 'Server Error' })).toBeNull();
    expect(toConstraintViolation({ error: { status: 500 } })).toBeNull();
    expect(toConstraintViolation(null)).toBeNull();
    expect(toConstraintViolation(new Error('boom'))).toBeNull();
  });
});
