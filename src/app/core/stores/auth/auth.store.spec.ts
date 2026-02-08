import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Dispatcher } from '@ngrx/signals/events';
import { AuthStore } from './auth.store';
import { AuthService } from '@core/services/api/auth';
import { UserStore } from '@core/stores/user';
import { TrustedDeviceStore } from '@core/stores/trusted-device';
import type { LoginInput, LoginOutput, LogoutOutput, MfaVerifyInput } from '@core/models/auth';

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
  let mockUserStore: {
    clear: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
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
    mockUserStore = {
      clear: vi.fn(),
      load: vi.fn(),
    };
    mockTrustedDeviceStore = {
      pendingTrustDevice: vi.fn().mockReturnValue(false),
      trustDevice: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserStore, useValue: mockUserStore },
        { provide: TrustedDeviceStore, useValue: mockTrustedDeviceStore },
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
    expect(store.loginOperation().status).toBe('success');
    expect(store.accessToken()).toBe('access-token');
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

    expect(store.loginOperation().status).toBe('success');
    expect(store.mfaRequired()).toBe(true);
    expect(store.mfaToken()).toBe('mfa-token');
    expect(store.challengeToken()).toBe('challenge-token');
    expect(store.accessToken()).toBeNull();
  });

  it('should dispatch an event on login error', async () => {
    mockAuthService.login.mockReturnValue(throwError(() => new Error('Invalid credentials')));

    store.login(credentials);
    await flushEffects();

    expect(store.loginOperation().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should initialize and load user profile when refresh succeeds', async () => {
    mockAuthService.refresh.mockReturnValue(of(loginResponse));

    await store.initialize();

    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBe('access-token');
    expect(store.refreshOperation().status).toBe('success');
    expect(mockUserStore.load).toHaveBeenCalledTimes(1);
  });

  it('should initialize as unauthenticated when refresh fails', async () => {
    mockAuthService.refresh.mockReturnValue(throwError(() => new Error('Refresh failed')));

    await store.initialize();

    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBeNull();
    expect(store.expiresAt()).toBeNull();
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

    expect(store.mfaVerifyOperation().status).toBe('success');
    expect(store.mfaRequired()).toBe(false);
    expect(store.accessToken()).toBe('access-token');
    expect(mockTrustedDeviceStore.trustDevice).toHaveBeenCalledTimes(1);
  });

  it('should fail MFA resend when no MFA token is present', async () => {
    store.mfaResend();
    await flushEffects();

    expect(mockAuthService.mfaResend).not.toHaveBeenCalled();
    expect(store.mfaResendOperation().status).toBe('error');
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

    expect(store.logoutOperation().status).toBe('success');
    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBeNull();
    expect(mockUserStore.clear).toHaveBeenCalledTimes(1);
  });
});
