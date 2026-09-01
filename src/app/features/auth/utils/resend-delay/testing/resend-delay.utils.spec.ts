import type { StoreError } from '@core/request-state';
import {
  toResendAvailableAt,
  toResendAvailableIn,
  toResendDelaySeconds,
} from '../resend-delay.utils';

const rateLimitError = (
  message: string | null,
  code: string | number | null = 429,
): StoreError => ({
  error: new Error(message ?? 'rate limited'),
  message,
  code,
  retryable: false,
  timestamp: Date.now(),
});

describe('toResendDelaySeconds', () => {
  it('should parse the delay from the 429 detail', () => {
    expect(toResendDelaySeconds(rateLimitError('Please wait 42 seconds before resending.'))).toBe(
      42,
    );
  });

  it('should return null for a non-429 error', () => {
    expect(
      toResendDelaySeconds(rateLimitError('Please wait 42 seconds before resending.', 400)),
    ).toBeNull();
  });

  it('should return null when the 429 message carries no parseable delay', () => {
    expect(toResendDelaySeconds(rateLimitError('Too many requests.'))).toBeNull();
    expect(toResendDelaySeconds(rateLimitError(null))).toBeNull();
  });
});

describe('toResendAvailableAt', () => {
  it('should convert a positive delay into a future timestamp', () => {
    const before: number = Date.now();

    const availableAt: number | null = toResendAvailableAt(60);

    expect(availableAt).not.toBeNull();
    expect(availableAt as number).toBeGreaterThanOrEqual(before + 60_000);
  });

  it('should return null for absent or non-positive delays', () => {
    expect(toResendAvailableAt(null)).toBeNull();
    expect(toResendAvailableAt(undefined)).toBeNull();
    expect(toResendAvailableAt(0)).toBeNull();
    expect(toResendAvailableAt(-5)).toBeNull();
  });
});

describe('toResendAvailableIn', () => {
  it('should return the whole seconds remaining, rounded up', () => {
    expect(toResendAvailableIn(Date.now() + 4500)).toBe(5);
  });

  it('should clamp an elapsed timestamp to zero', () => {
    expect(toResendAvailableIn(Date.now() - 1000)).toBe(0);
  });

  it('should return zero when no timestamp is held', () => {
    expect(toResendAvailableIn(null)).toBe(0);
  });
});
