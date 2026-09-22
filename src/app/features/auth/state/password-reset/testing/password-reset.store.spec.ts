import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { PasswordResetService } from '@features/auth/data-access';
import type {
  PasswordResetRequestInput,
  PasswordResetRequestOutput,
  PasswordResetResendOutput,
  PasswordResetVerifyOutput,
} from '@features/auth/models';
import { PasswordResetStore } from '../password-reset.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('PasswordResetStore', () => {
  let store: PasswordResetStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockPasswordResetService: {
    request: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    resend: ReturnType<typeof vi.fn>;
  };

  const requestInput: PasswordResetRequestInput = {
    email: 'test@example.com',
  };
  const requestResponse: PasswordResetRequestOutput = {
    '@id': '/api/auth/password/reset/request',
    '@type': 'RequestPasswordResetOutput',
    success: true,
    message: 'Code sent',
    challengeToken: 'challenge-token',
    maskedRecipient: 't***@e***.com',
    expiresAt: '2026-01-01T00:10:00Z',
    maxAttempts: 5,
    canResendIn: 30,
  };
  const confirmResponse: PasswordResetVerifyOutput = {
    '@id': '/api/auth/password/reset/confirm',
    '@type': 'ConfirmPasswordResetOutput',
    success: true,
    message: 'Password updated',
    errorCode: null,
    attemptsRemaining: 5,
  };
  const resendResponse: PasswordResetResendOutput = {
    '@id': '/api/auth/password/reset/resend',
    '@type': 'ResendPasswordResetOutput',
    success: true,
    message: 'Code resent',
    challengeToken: 'challenge-token-2',
    maskedRecipient: 't***@e***.com',
    expiresAt: '2026-01-01T00:20:00Z',
    maxAttempts: 5,
    canResendIn: 30,
  };

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockPasswordResetService = {
      request: vi.fn(),
      confirm: vi.fn(),
      resend: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: PasswordResetService, useValue: mockPasswordResetService },
      ],
    });

    store = TestBed.inject(PasswordResetStore);
  });

  afterEach(() => vi.restoreAllMocks());

  it('should request password reset and persist challenge token', async () => {
    mockPasswordResetService.request.mockReturnValue(of(requestResponse));

    store.request(requestInput);
    await flushEffects();

    expect(mockPasswordResetService.request).toHaveBeenCalledWith(requestInput);
    expect(store.requestCallState().status).toBe('success');
    expect(store.currentRequest()).toEqual(requestResponse);
    expect(store.challengeToken()).toBe('challenge-token');
    expect(store.verificationCode()).toBeNull();
  });

  it('should dispatch event on request failure', async () => {
    mockPasswordResetService.request.mockReturnValue(throwError(() => new Error('Failed')));

    store.request(requestInput);
    await flushEffects();

    expect(store.requestCallState().status).toBe('error');
    expect(store.requestError()).not.toBeNull();
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should fail confirm immediately when challenge token is missing', async () => {
    store.confirm({ code: '123456', newPassword: 'NewPass123!' });
    await flushEffects();

    expect(mockPasswordResetService.confirm).not.toHaveBeenCalled();
    expect(store.confirmCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should confirm password reset when challenge token exists', async () => {
    mockPasswordResetService.request.mockReturnValue(of(requestResponse));
    mockPasswordResetService.confirm.mockReturnValue(of(confirmResponse));

    store.request(requestInput);
    await flushEffects();
    store.confirm({ code: '123456', newPassword: 'NewPass123!' });
    await flushEffects();

    expect(mockPasswordResetService.confirm).toHaveBeenCalledWith({
      token: 'challenge-token',
      code: '123456',
      newPassword: 'NewPass123!',
    });
    expect(store.confirmCallState().status).toBe('success');
  });

  it('should fail resend when challenge token is missing', async () => {
    store.resend();
    await flushEffects();

    expect(mockPasswordResetService.resend).not.toHaveBeenCalled();
    expect(store.resendCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should resend verification code and update challenge token', async () => {
    mockPasswordResetService.request.mockReturnValue(of(requestResponse));
    mockPasswordResetService.resend.mockReturnValue(of(resendResponse));

    store.request(requestInput);
    await flushEffects();
    store.resend();
    await flushEffects();

    expect(mockPasswordResetService.resend).toHaveBeenCalledWith({
      token: 'challenge-token',
    });
    expect(store.resendCallState().status).toBe('success');
    expect(store.currentRequest()).toEqual(resendResponse);
    expect(store.challengeToken()).toBe('challenge-token-2');
  });

  it('should clear all password reset state', async () => {
    mockPasswordResetService.request.mockReturnValue(of(requestResponse));
    store.request(requestInput);
    await flushEffects();
    store.setVerificationCode('123456');

    store.clear();

    expect(store.currentRequest()).toBeNull();
    expect(store.challengeToken()).toBeNull();
    expect(store.verificationCode()).toBeNull();
    expect(store.requestCallState().status).toBe('idle');
    expect(store.confirmCallState().status).toBe('idle');
    expect(store.resendCallState().status).toBe('idle');
  });

  it('keeps the challenge and verification code when confirmation fails', () => {
    const pending = new Subject<PasswordResetVerifyOutput>();
    mockPasswordResetService.confirm.mockReturnValue(pending);
    store.setChallengeToken('retained-challenge');
    store.setVerificationCode('123456');

    store.confirm({ code: '123456', newPassword: 'NewPass123!' });
    expect(store.isConfirming()).toBe(true);
    pending.error({ '@type': 'Error', status: 422, detail: 'Invalid verification code.' });

    expect(store.isConfirming()).toBe(false);
    expect(store.confirmError()).toMatchObject({ code: 422 });
    expect(store.challengeToken()).toBe('retained-challenge');
    expect(store.verificationCode()).toBe('123456');
    expect(mockDispatcher.dispatch).toHaveBeenCalledOnce();
  });

  it.each([
    { code: 'rate_limit_exceeded', retryAfterSeconds: 75, expected: 75 },
    { code: 'delivery_unavailable', retryAfterSeconds: undefined, expected: 30 },
  ])(
    'preserves the challenge after a refused resend: $code',
    ({ code, retryAfterSeconds, expected }) => {
      vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
      mockPasswordResetService.request.mockReturnValue(of(requestResponse));
      const pending = new Subject<PasswordResetResendOutput>();
      mockPasswordResetService.resend.mockReturnValue(pending);
      store.request(requestInput);

      store.resend();
      expect(store.isResending()).toBe(true);
      pending.error({
        '@type': 'Error',
        status: 429,
        code,
        retryAfterSeconds,
        detail: 'Try again later.',
      });

      expect(store.isResending()).toBe(false);
      expect(store.resendError()).toMatchObject({ code: 429, error: { code } });
      expect(store.resendAvailableIn()).toBe(expected);
      expect(store.challengeToken()).toBe('challenge-token');
      expect(mockDispatcher.dispatch).toHaveBeenCalledOnce();
    },
  );
});
