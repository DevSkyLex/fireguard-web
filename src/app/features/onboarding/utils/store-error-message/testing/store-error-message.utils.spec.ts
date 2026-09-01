import { HttpErrorResponse } from '@angular/common/http';
import { toStoreError } from '@core/request-state';
import { storeErrorMessage } from '../store-error-message.utils';

describe('storeErrorMessage', () => {
  it('should return the message carried by a normalized StoreError', () => {
    const error = toStoreError(new Error('The required action was not completed.'));

    expect(storeErrorMessage(error)).toBe('The required action was not completed.');
  });

  it('should return null for a raw HttpErrorResponse', () => {
    const error = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });

    expect(storeErrorMessage(error)).toBeNull();
  });

  it('should return null for a StoreError without a usable message', () => {
    const error = { error: null, message: null, code: null, retryable: false, timestamp: 1 };

    expect(storeErrorMessage(error)).toBeNull();
  });

  it('should return null for null, undefined and primitives', () => {
    expect(storeErrorMessage(null)).toBeNull();
    expect(storeErrorMessage(undefined)).toBeNull();
    expect(storeErrorMessage('boom')).toBeNull();
  });
});
