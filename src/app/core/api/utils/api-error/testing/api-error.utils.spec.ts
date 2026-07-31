import type { ApiError } from '../../../models';
import { isApiError } from '../api-error.utils';

/**
 * A 401 exactly as the API returns it.
 *
 * Captured from a live response rather than hand-written: API Platform sets
 * `skip_null_values` on its Error resource, so absent values are *omitted keys*,
 * never `null`. `instance` is missing here for that reason, and the model has to
 * describe it as optional — declaring it `string | null` made TypeScript promise a
 * property that never arrives.
 */
const REAL_401 = {
  '@context': '/api/contexts/Error',
  '@id': '/api/errors/401',
  '@type': 'Error',
  title: 'An error occurred',
  detail: 'Full authentication is required to access this resource.',
  status: 401,
  type: '/errors/401',
  description: 'Full authentication is required to access this resource.',
};

describe('isApiError', () => {
  it('accepts a real API error payload', () => {
    expect(isApiError(REAL_401)).toBe(true);
  });

  it('accepts a payload that omits every optional field', () => {
    const minimal = { '@type': 'Error', status: 500, detail: 'Server error' };

    expect(isApiError(minimal)).toBe(true);
  });

  it('narrows to a type whose optional fields are safe to read when absent', () => {
    if (!isApiError(REAL_401)) throw new Error('guard should have accepted the payload');

    const error: ApiError = REAL_401;
    // The point of the change: `instance` is absent on the wire, so it must read
    // as `undefined` rather than being typed as an always-present `string | null`.
    expect(error.instance).toBeUndefined();
    expect(error.title).toBe('An error occurred');
  });

  it.each([
    ['a payload without detail', { '@type': 'Error', status: 401 }],
    ['a payload without status', { '@type': 'Error', detail: 'x' }],
    ['a plain Error', new Error('boom')],
    ['null', null],
    ['a string', 'nope'],
  ])('rejects %s', (_label, candidate) => {
    expect(isApiError(candidate)).toBe(false);
  });
});
