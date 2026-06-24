import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { RegistrationService } from '@features/auth/data-access';
import type { LoginOutput, RegisterInput, RegisterOutput } from '@features/auth/models';
import { AuthStore } from '@features/auth/state';
import { RegisterStore } from '../register.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('RegisterStore', () => {
  let store: RegisterStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockRegistrationService: {
    register: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
    resend: ReturnType<typeof vi.fn>;
  };
  let mockAuthStore: { applySession: ReturnType<typeof vi.fn> };

  const registerInput: RegisterInput = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'SecureP@ss123!',
  };
  const registerResponse: RegisterOutput = {
    '@id': '/api/auth/register',
    '@type': 'RegisterOutput',
    success: true,
    message: 'Account created',
    challengeToken: 'challenge-token',
    maskedRecipient: 'j***@e***.com',
    expiresAt: '2026-01-01T00:10:00Z',
    maxAttempts: 10,
    canResendIn: 60,
  };
  const resendResponse: RegisterOutput = {
    ...registerResponse,
    '@id': '/api/auth/register/resend',
    challengeToken: 'challenge-token-2',
  };
  const verifyResponse: LoginOutput = {
    '@id': '/api/auth/register/verify',
    '@type': 'Token',
    access_token: 'access-token-abc',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'OPENID PROFILE',
  };

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockRegistrationService = {
      register: vi.fn(),
      verify: vi.fn(),
      resend: vi.fn(),
    };
    mockAuthStore = { applySession: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: RegistrationService, useValue: mockRegistrationService },
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });

    store = TestBed.inject(RegisterStore);
  });

  it('should register and persist the challenge token', async () => {
    mockRegistrationService.register.mockReturnValue(of(registerResponse));

    store.register(registerInput);
    await flushEffects();

    expect(mockRegistrationService.register).toHaveBeenCalledWith(registerInput);
    expect(store.requestCallState().status).toBe('success');
    expect(store.challengeToken()).toBe('challenge-token');
    expect(store.maskedRecipient()).toBe('j***@e***.com');
    expect(store.hasChallenge()).toBe(true);
  });

  it('should dispatch an event on registration failure', async () => {
    mockRegistrationService.register.mockReturnValue(throwError(() => new Error('Email taken')));

    store.register(registerInput);
    await flushEffects();

    expect(store.requestCallState().status).toBe('error');
    expect(store.registerError()).not.toBeNull();
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should fail verify immediately when no challenge is in progress', async () => {
    store.verify({ code: '123456' });
    await flushEffects();

    expect(mockRegistrationService.verify).not.toHaveBeenCalled();
    expect(store.verifyCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should verify and apply the session to AuthStore', async () => {
    mockRegistrationService.register.mockReturnValue(of(registerResponse));
    mockRegistrationService.verify.mockReturnValue(of(verifyResponse));

    store.register(registerInput);
    await flushEffects();
    store.verify({ code: '123456' });
    await flushEffects();

    expect(mockRegistrationService.verify).toHaveBeenCalledWith({
      token: 'challenge-token',
      code: '123456',
    });
    expect(store.verifyCallState().status).toBe('success');
    expect(mockAuthStore.applySession).toHaveBeenCalledWith(verifyResponse);
  });

  it('should fail resend when no challenge is in progress', async () => {
    store.resend();
    await flushEffects();

    expect(mockRegistrationService.resend).not.toHaveBeenCalled();
    expect(store.resendCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should resend and update the challenge token', async () => {
    mockRegistrationService.register.mockReturnValue(of(registerResponse));
    mockRegistrationService.resend.mockReturnValue(of(resendResponse));

    store.register(registerInput);
    await flushEffects();
    store.resend();
    await flushEffects();

    expect(mockRegistrationService.resend).toHaveBeenCalledWith({ token: 'challenge-token' });
    expect(store.resendCallState().status).toBe('success');
    expect(store.challengeToken()).toBe('challenge-token-2');
  });

  it('should clear all registration state', async () => {
    mockRegistrationService.register.mockReturnValue(of(registerResponse));
    store.register(registerInput);
    await flushEffects();

    store.clear();

    expect(store.currentChallenge()).toBeNull();
    expect(store.challengeToken()).toBeNull();
    expect(store.maskedRecipient()).toBeNull();
    expect(store.hasChallenge()).toBe(false);
    expect(store.requestCallState().status).toBe('idle');
    expect(store.verifyCallState().status).toBe('idle');
    expect(store.resendCallState().status).toBe('idle');
  });
});
