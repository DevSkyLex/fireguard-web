import type { ApiError } from '@core/api/models';
import type { StoreError } from '@core/request-state';
import { decideErrorMessage } from '../decide-error-message.utils';

describe('decideErrorMessage', () => {
  const baseError: ApiError = {
    '@id': '',
    '@type': 'Error',
    status: 0,
    type: 'about:blank',
    title: '',
    detail: '',
  };

  function storeError(
    code: number | null,
    detail: string,
    message: string | null = null,
  ): StoreError {
    return {
      error: { ...baseError, status: code ?? 0, detail },
      message,
      code,
      retryable: false,
      timestamp: Date.now(),
    };
  }

  it('should map a 409 with a subject-changed detail to the cancellation copy', () => {
    expect(
      decideErrorMessage(storeError(409, 'The deferred action can no longer be applied: reopened')),
    ).toContain('cancelled');
  });

  it('should map any other 409 to the already-decided copy', () => {
    expect(
      decideErrorMessage(storeError(409, 'Approval request with ID "x" is no longer pending.')),
    ).toContain('already decided');
  });

  it('should map a 403 with a self-approval detail to the self-approval copy', () => {
    expect(
      decideErrorMessage(
        storeError(403, 'The requester cannot decide on their own approval request.'),
      ),
    ).toContain('yourself');
  });

  it('should map any other 403 to the below-minimum-role copy', () => {
    expect(
      decideErrorMessage(
        storeError(403, 'Deciding this request requires at least the "admin" role.'),
      ),
    ).toContain('approver');
  });

  it('should fall back to the normalized message for any other status', () => {
    expect(decideErrorMessage(storeError(500, '', 'Server exploded'))).toBe('Server exploded');
  });

  it('should fall back to the generic copy when there is no normalized message', () => {
    expect(decideErrorMessage(storeError(null, ''))).toContain('could not be recorded');
  });
});
