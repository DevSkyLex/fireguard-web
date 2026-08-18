import type { StoreError } from '@core/request-state';
import { nonConformityStatusErrorMessage } from '../non-conformity-status-error-message.utils';

function storeError(code: number | null, message: string | null): StoreError {
  return { error: null, message, code, retryable: false, timestamp: Date.now() };
}

describe('nonConformityStatusErrorMessage', () => {
  it('should map a 409 to the already-resolved copy regardless of the message', () => {
    expect(nonConformityStatusErrorMessage(storeError(409, 'Conflict'))).toContain(
      'already resolved',
    );
  });

  it('should fall back to the normalized message for any other status', () => {
    expect(nonConformityStatusErrorMessage(storeError(403, 'Missing permission'))).toBe(
      'Missing permission',
    );
  });

  it('should fall back to the generic copy when there is no normalized message', () => {
    expect(nonConformityStatusErrorMessage(storeError(null, null))).toContain(
      'could not be updated',
    );
  });
});
