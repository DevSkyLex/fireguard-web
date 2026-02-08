import {
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createErrorOperation,
  isOperationSuccess,
  isOperationError,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
} from './operation.helpers';
import type { ApiError } from '@core/models/api';

describe('Operation Helpers', () => {
  describe('createIdleOperation', () => {
    it('should create idle operation with null data and error', () => {
      const op = createIdleOperation();
      expect(op.status).toBe('idle');
      expect(op.data).toBeNull();
      expect(op.error).toBeNull();
    });
  });

  describe('createLoadingOperation', () => {
    it('should create loading operation preserving cached data', () => {
      const cachedData = { id: 1 };
      const op = createLoadingOperation(cachedData);
      expect(op.status).toBe('loading');
      expect(op.data).toEqual(cachedData);
      expect(op.error).toBeNull();
    });

    it('should create loading operation with null data', () => {
      const op = createLoadingOperation(null);
      expect(op.status).toBe('loading');
      expect(op.data).toBeNull();
    });
  });

  describe('createSuccessOperation', () => {
    it('should create success operation with data', () => {
      const data = { token: 'abc' };
      const op = createSuccessOperation(data);
      expect(op.status).toBe('success');
      expect(op.data).toEqual(data);
      expect(op.error).toBeNull();
    });
  });

  describe('createErrorOperation', () => {
    it('should create error operation with error and cached data', () => {
      const error = {
        error: new Error('fail'),
        message: 'fail',
        code: 500,
        retryable: true,
        timestamp: Date.now(),
      };
      const cachedData = { id: 1 };
      const op = createErrorOperation(error, cachedData);
      expect(op.status).toBe('error');
      expect(op.error).toEqual(error);
      expect(op.data).toEqual(cachedData);
    });
  });

  describe('isOperationSuccess', () => {
    it('should return true for success operations', () => {
      const op = createSuccessOperation({ id: 1 });
      expect(isOperationSuccess(op)).toBe(true);
    });

    it('should return false for non-success operations', () => {
      expect(isOperationSuccess(createIdleOperation())).toBe(false);
      expect(isOperationSuccess(createLoadingOperation(null))).toBe(false);
    });
  });

  describe('isOperationError', () => {
    it('should return true for error operations', () => {
      const error = {
        error: 'fail',
        message: 'fail',
        code: null,
        retryable: false,
        timestamp: Date.now(),
      };
      const op = createErrorOperation(error, null);
      expect(isOperationError(op)).toBe(true);
    });

    it('should return false for non-error operations', () => {
      expect(isOperationError(createIdleOperation())).toBe(false);
      expect(isOperationError(createSuccessOperation({}))).toBe(false);
    });
  });

  describe('createOperationErrorFromUnknown', () => {
    it('should handle ApiError with detail and status', () => {
      const apiError: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 422,
        type: 'about:blank',
        title: 'Validation Error',
        detail: 'Invalid email format',
        instance: null,
      };

      const result = createOperationErrorFromUnknown(apiError);
      expect(result.message).toBe('Invalid email format');
      expect(result.code).toBe(422);
      expect(result.retryable).toBe(false);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should mark 5xx errors as retryable', () => {
      const apiError: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 503,
        type: 'about:blank',
        title: 'Service Unavailable',
        detail: 'Server is overloaded',
        instance: null,
      };

      const result = createOperationErrorFromUnknown(apiError);
      expect(result.retryable).toBe(true);
    });

    it('should handle Error instances', () => {
      const error = new Error('Something went wrong');
      const result = createOperationErrorFromUnknown(error);
      expect(result.message).toBe('Something went wrong');
      expect(result.code).toBeNull();
      expect(result.retryable).toBe(false);
    });

    it('should handle unknown error types with fallback message', () => {
      const result = createOperationErrorFromUnknown('string error');
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.code).toBeNull();
      expect(result.retryable).toBe(false);
    });
  });

  describe('toOperationFailureEventPayload', () => {
    it('should map operation error to event payload', () => {
      const error = {
        error: 'fail',
        message: 'Login failed',
        code: 401 as number | null,
        retryable: false,
        timestamp: 1234567890,
      };

      const payload = toOperationFailureEventPayload(error, 'Default message');
      expect(payload.message).toBe('Login failed');
      expect(payload.code).toBe(401);
      expect(payload.retryable).toBe(false);
      expect(payload.timestamp).toBe(1234567890);
    });

    it('should use fallback message when error message is nullish', () => {
      const error = {
        error: 'fail',
        message: undefined as unknown as string,
        code: null,
        retryable: false,
        timestamp: Date.now(),
      };

      const payload = toOperationFailureEventPayload(error, 'Fallback');
      expect(payload.message).toBe('Fallback');
    });
  });
});
