import type { StoreError } from '@core/state/request-state';
import {
  isQuotaExceededError,
  quotaUsageColor,
  resolveQuotaStatus,
} from '@features/organization/utils';

describe('quota-status utils', () => {
  describe('resolveQuotaStatus', () => {
    it('returns ok for an unlimited resource', () => {
      expect(resolveQuotaStatus(9999, null)).toBe('ok');
    });

    it('returns ok well below the near-limit threshold', () => {
      expect(resolveQuotaStatus(3, 10)).toBe('ok');
    });

    it('returns near at or above the 80% threshold', () => {
      expect(resolveQuotaStatus(8, 10)).toBe('near');
      expect(resolveQuotaStatus(9, 10)).toBe('near');
    });

    it('returns full once usage reaches the limit', () => {
      expect(resolveQuotaStatus(10, 10)).toBe('full');
      expect(resolveQuotaStatus(12, 10)).toBe('full');
    });

    it('treats a zero or negative limit as unlimited (ok)', () => {
      expect(resolveQuotaStatus(5, 0)).toBe('ok');
    });
  });

  describe('quotaUsageColor', () => {
    it('maps each status to its theme colour variable', () => {
      expect(quotaUsageColor('full')).toBe('var(--p-red-500)');
      expect(quotaUsageColor('near')).toBe('var(--p-orange-400)');
      expect(quotaUsageColor('ok')).toBe('var(--p-primary-color)');
    });
  });

  describe('isQuotaExceededError', () => {
    const baseError: StoreError = {
      error: null,
      message: null,
      code: null,
      retryable: false,
      timestamp: 0,
    };

    it('returns true for a 409 store error', () => {
      expect(isQuotaExceededError({ ...baseError, code: 409 })).toBe(true);
    });

    it('returns false for other status codes', () => {
      expect(isQuotaExceededError({ ...baseError, code: 400 })).toBe(false);
      expect(isQuotaExceededError({ ...baseError, code: null })).toBe(false);
    });
  });
});
