import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { USER_PROFILE_PORT } from '@features/account/ports';
import { AuthService } from '@features/auth/data-access';
import type { LoginInput, LoginOutput, LogoutOutput, MfaVerifyInput } from '@features/auth/models';
import { ActiveTrustedDeviceStore } from '@features/auth/state';
import { AuthStore } from '../auth.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('AuthStore', () => {
  let store: AuthStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    mfaVerify: ReturnType<typeof vi.fn>;
    mfaResend: ReturnType<typeof vi.fn>;
  };
  let mockUserProfilePort: {
    clear: ReturnType<typeof vi.fn>;
    initialize: ReturnType<typeof vi.fn>;
  };
  let mockTrustedDeviceStore: {
    pendingTrustDevice: ReturnType<typeof vi.fn>;
    trustDevice: ReturnType<typeof vi.fn>;
  };

  const credentials: LoginInput = {
    email: 'test@example.com',
    password: 'password123',
  };

  const loginResponse: LoginOutput = {
    '@id': '/api/auth/login',
    '@type': 'Token',
    access_token: 'access-token',
    token_type: 'Bearer',
    expires_in: 3600,
  };

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockAuthService = {
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      mfaVerify: vi.fn(),
      mfaResend: vi.fn(),
    };
    mockUserProfilePort = {
      clear: vi.fn(),
      initialize: vi.fn(),
    };
    mockTrustedDeviceStore = {
      pendingTrustDevice: vi.fn().mockReturnValue(false),
      trustDevice: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: AuthService, useValue: mockAuthService },
        { provide: USER_PROFILE_PORT, useValue: mockUserProfilePort },
        { provide: ActiveTrustedDeviceStore, useValue: mockTrustedDeviceStore },
      ],
    });

    store = TestBed.inject(AuthStore);
  });

  it('should set and clear token synchronously', () => {
    store.setToken('manual-token', 3600);

    expect(store.accessToken()).toBe('manual-token');
    expect(store.isAuthenticated()).toBe(true);

    store.clearToken();

    expect(store.accessToken()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('should store access token on login success without MFA', async () => {
    mockAuthService.login.mockReturnValue(of(loginResponse));

    store.login(credentials);
    await flushEffects();

    expect(mockAuthService.login).toHaveBeenCalledWith(credentials);
    expect(store.loginCallState().status).toBe('success');
    expect(store.accessToken()).toBe('access-token');
    expect(store.expiresAt()).not.toBeNull();
    expect(store.mfaRequired()).toBe(false);
  });

  it('should store MFA state when login requires MFA', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: '',
      expires_in: 0,
      mfa_required: true,
      mfa_token: 'mfa-token',
      challenge_token: 'challenge-token',
    };
    mockAuthService.login.mockReturnValue(of(mfaResponse));

    store.login(credentials);
    await flushEffects();

    expect(store.loginCallState().status).toBe('success');
    expect(store.mfaRequired()).toBe(true);
    expect(store.mfaToken()).toBe('mfa-token');
    expect(store.challengeToken()).toBe('challenge-token');
    expect(store.accessToken()).toBeNull();
  });

  it('should dispatch an event on login error', async () => {
    mockAuthService.login.mockReturnValue(throwError(() => new Error('Invalid credentials')));

    store.login(credentials);
    await flushEffects();

    expect(store.loginCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should initialize and load user profile when refresh succeeds', async () => {
    mockAuthService.refresh.mockReturnValue(of(loginResponse));

    await store.initialize();

    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBe('access-token');
    expect(store.refreshCallState().status).toBe('success');
    expect(mockUserProfilePort.initialize).toHaveBeenCalledTimes(1);
  });

  it('should initialize as unauthenticated when refresh fails', async () => {
    mockAuthService.refresh.mockReturnValue(throwError(() => new Error('Refresh failed')));

    await store.initialize();

    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBeNull();
    expect(store.expiresAt()).toBeNull();
    expect(mockUserProfilePort.initialize).not.toHaveBeenCalled();
  });

  it('should verify MFA and trust device when pending flag is true', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: '',
      expires_in: 0,
      mfa_required: true,
      mfa_token: 'mfa-token',
      challenge_token: 'challenge-token',
    };
    const verifyInput: MfaVerifyInput = {
      preAuthToken: 'mfa-token',
      code: '123456',
    };

    mockAuthService.login.mockReturnValue(of(mfaResponse));
    mockAuthService.mfaVerify.mockReturnValue(of(loginResponse));
    mockTrustedDeviceStore.pendingTrustDevice.mockReturnValue(true);

    store.login(credentials);
    await flushEffects();
    store.mfaVerify(verifyInput);
    await flushEffects();

    expect(store.mfaVerifyCallState().status).toBe('success');
    expect(store.mfaRequired()).toBe(false);
    expect(store.accessToken()).toBe('access-token');
    expect(mockTrustedDeviceStore.trustDevice).toHaveBeenCalledTimes(1);
  });

  it('should fail MFA resend when no MFA token is present', async () => {
    store.mfaResend();
    await flushEffects();

    expect(mockAuthService.mfaResend).not.toHaveBeenCalled();
    expect(store.mfaResendCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should reset state and clear user profile on logout success', async () => {
    const logoutResponse: LogoutOutput = {
      '@id': '/api/auth/logout',
      '@type': 'Logout',
      message: 'Logged out',
    };
    mockAuthService.logout.mockReturnValue(of(logoutResponse));
    store.setToken('access-token', 3600);

    store.logout();
    await flushEffects();

    expect(store.logoutCallState().status).toBe('success');
    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBeNull();
    expect(mockUserProfilePort.clear).toHaveBeenCalledTimes(1);
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should clear state and dispatch an event on logout error', async () => {
    mockAuthService.logout.mockReturnValue(throwError(() => new Error('Network error')));
    store.setToken('access-token', 3600);

    store.logout();
    await flushEffects();

    expect(store.logoutCallState().status).toBe('error');
    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBeNull();
    expect(mockUserProfilePort.clear).toHaveBeenCalledTimes(1);
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should resend MFA code and update tokens when MFA token is present', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: '',
      expires_in: 0,
      mfa_required: true,
      mfa_token: 'mfa-token',
      challenge_token: 'challenge-token',
    };
    const resendResponse: LoginOutput = {
      ...loginResponse,
      access_token: '',
      expires_in: 0,
      mfa_required: true,
      mfa_token: 'new-mfa-token',
      challenge_token: 'new-challenge-token',
    };
    mockAuthService.login.mockReturnValue(of(mfaResponse));
    mockAuthService.mfaResend.mockReturnValue(of(resendResponse));

    store.login(credentials);
    await flushEffects();
    store.mfaResend();
    await flushEffects();

    expect(mockAuthService.mfaResend).toHaveBeenCalledWith({ preAuthToken: 'mfa-token' });
    expect(store.mfaResendCallState().status).toBe('success');
    expect(store.loginCallState().status).toBe('success');
    expect(store.mfaToken()).toBe('new-mfa-token');
    expect(store.challengeToken()).toBe('new-challenge-token');
  });

  it('should dispatch an event on MFA verification error', async () => {
    const verifyInput: MfaVerifyInput = {
      preAuthToken: 'mfa-token',
      code: '000000',
    };
    mockAuthService.mfaVerify.mockReturnValue(throwError(() => new Error('Invalid code')));

    store.mfaVerify(verifyInput);
    await flushEffects();

    expect(store.mfaVerifyCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should not trust device when pending flag is false after MFA verification', async () => {
    const verifyInput: MfaVerifyInput = {
      preAuthToken: 'mfa-token',
      code: '123456',
    };
    mockAuthService.mfaVerify.mockReturnValue(of(loginResponse));
    mockTrustedDeviceStore.pendingTrustDevice.mockReturnValue(false);

    store.mfaVerify(verifyInput);
    await flushEffects();

    expect(store.mfaVerifyCallState().status).toBe('success');
    expect(mockTrustedDeviceStore.trustDevice).not.toHaveBeenCalled();
  });

  it('should refresh independently on initialization and never rely on SSR auth transfer state', async () => {
    mockAuthService.refresh.mockReturnValue(of(loginResponse));

    await store.initialize();

    expect(mockAuthService.refresh).toHaveBeenCalledTimes(1);
    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBe('access-token');
    expect(mockUserProfilePort.initialize).toHaveBeenCalledTimes(1);
  });

  it('should return true for isAuthenticated when token is set and not expired', () => {
    store.setToken('valid-token', 3600);

    expect(store.isAuthenticated()).toBe(true);
  });

  it('should return false for isAuthenticated when token is null', () => {
    expect(store.isAuthenticated()).toBe(false);
  });

  it('should return false for isAuthenticated when token is expired', () => {
    store.setToken('expired-token', -1);

    expect(store.isAuthenticated()).toBe(false);
  });

  it('should return true for isTokenExpiringSoon when token expires within 5 minutes', () => {
    store.setToken('expiring-token', 60);

    expect(store.isTokenExpiringSoon()).toBe(true);
  });

  it('should return false for isTokenExpiringSoon when token is far from expiry', () => {
    store.setToken('valid-token', 3600);

    expect(store.isTokenExpiringSoon()).toBe(false);
  });

  it('should expose mfaMethod and mfaDestination from login response', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: '',
      expires_in: 0,
      mfa_required: true,
      mfa_token: 'mfa-token',
      challenge_token: 'challenge-token',
      mfa_method: 'email',
      mfa_destination: 'u***@example.com',
    };
    mockAuthService.login.mockReturnValue(of(mfaResponse));

    store.login(credentials);
    await flushEffects();

    expect(store.mfaMethod()).toBe('email');
    expect(store.mfaDestination()).toBe('u***@example.com');
  });

  it('should clear MFA flags when clearMfaState is called', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: '',
      expires_in: 0,
      mfa_required: true,
      mfa_token: 'mfa-token',
      challenge_token: 'challenge-token',
    };
    mockAuthService.login.mockReturnValue(of(mfaResponse));

    store.login(credentials);
    await flushEffects();
    store.clearMfaState();

    expect(store.mfaRequired()).toBe(false);
    expect(store.mfaToken()).toBeNull();
    expect(store.challengeToken()).toBeNull();
  });

  it('should reset all operation call states to idle when resetOperations is called', async () => {
    mockAuthService.login.mockReturnValue(throwError(() => new Error('Failed')));

    store.login(credentials);
    await flushEffects();

    expect(store.loginCallState().status).toBe('error');

    store.resetOperations();

    expect(store.loginCallState().status).toBe('idle');
    expect(store.logoutCallState().status).toBe('idle');
    expect(store.refreshCallState().status).toBe('idle');
    expect(store.mfaVerifyCallState().status).toBe('idle');
    expect(store.mfaResendCallState().status).toBe('idle');
  });

  it('should reset only login call state when resetLoginOperation is called', async () => {
    mockAuthService.login.mockReturnValue(throwError(() => new Error('Failed')));

    store.login(credentials);
    await flushEffects();

    expect(store.loginCallState().status).toBe('error');

    store.resetLoginOperation();

    expect(store.loginCallState().status).toBe('idle');
  });

  it('should reset only MFA verify call state when resetMfaVerifyOperation is called', async () => {
    const verifyInput: MfaVerifyInput = {
      preAuthToken: 'mfa-token',
      code: '000000',
    };
    mockAuthService.mfaVerify.mockReturnValue(throwError(() => new Error('Invalid code')));

    store.mfaVerify(verifyInput);
    await flushEffects();

    expect(store.mfaVerifyCallState().status).toBe('error');

    store.resetMfaVerifyOperation();

    expect(store.mfaVerifyCallState().status).toBe('idle');
  });

  it('should update access token on refresh success', async () => {
    mockAuthService.refresh.mockReturnValue(of(loginResponse));

    store.refresh();
    await flushEffects();

    expect(store.refreshCallState().status).toBe('success');
    expect(store.accessToken()).toBe('access-token');
    expect(store.expiresAt()).not.toBeNull();
  });

  it('should clear token on refresh error', async () => {
    mockAuthService.refresh.mockReturnValue(throwError(() => new Error('Refresh failed')));

    store.refresh();
    await flushEffects();

    expect(store.refreshCallState().status).toBe('error');
    expect(store.accessToken()).toBeNull();
    expect(store.expiresAt()).toBeNull();
  });

  it('should dispatch an event on MFA resend service error', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: '',
      expires_in: 0,
      mfa_required: true,
      mfa_token: 'mfa-token',
      challenge_token: 'challenge-token',
    };
    mockAuthService.login.mockReturnValue(of(mfaResponse));
    mockAuthService.mfaResend.mockReturnValue(throwError(() => new Error('Service error')));

    store.login(credentials);
    await flushEffects();
    store.mfaResend();
    await flushEffects();

    expect(mockAuthService.mfaResend).toHaveBeenCalledWith({ preAuthToken: 'mfa-token' });
    expect(store.mfaResendCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });
});

