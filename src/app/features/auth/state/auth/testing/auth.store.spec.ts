import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { delay, firstValueFrom, of, Subject, throwError } from 'rxjs';
import { USER_PROFILE_PORT } from '@features/account/ports';
import { AuthService } from '@features/auth/data-access';
import type { LoginInput, LoginOutput, LogoutOutput, MfaVerifyInput } from '@features/auth/models';
import { ActiveTrustedDeviceStore } from '@features/auth/state';
import { AuthStore } from '../auth.store';
import { authStoreEvents } from '../events';

/** Event types seen by the dispatcher spy, in dispatch order. */
const dispatchedTypes = (dispatcher: { dispatch: ReturnType<typeof vi.fn> }): string[] =>
  dispatcher.dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

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
    load: ReturnType<typeof vi.fn>;
  };
  let mockTrustedDeviceStore: {
    pendingTrustDevice: ReturnType<typeof vi.fn>;
    trustDevice: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
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
      load: vi.fn(),
    };
    mockTrustedDeviceStore = {
      pendingTrustDevice: vi.fn().mockReturnValue(false),
      trustDevice: vi.fn(),
      clear: vi.fn(),
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
    expect(mockTrustedDeviceStore.clear).toHaveBeenCalledTimes(1);
  });

  it('exposes login progress and refusal while remaining unauthenticated', () => {
    const pending = new Subject<LoginOutput>();
    mockAuthService.login.mockReturnValue(pending);
    store.login(credentials);
    expect(store.isLoggingIn()).toBe(true);
    expect(store.loginError()).toBeNull();
    expect(store.isTokenExpiringSoon()).toBe(false);
    pending.error({ '@type': 'Error', status: 401, detail: 'Invalid credentials.' });
    expect(store.isLoggingIn()).toBe(false);
    expect(store.loginError()).toMatchObject({ code: 401, message: 'Invalid credentials.' });
    expect(store.isAuthenticated()).toBe(false);
  });

  it('reports MFA verification and resend failures without granting a session', () => {
    store.applySession({
      ...loginResponse,
      access_token: null,
      expires_in: null,
      mfa_required: true,
      mfa_token: 'mfa-token',
      challenge_token: 'challenge-token',
    });
    const verifying = new Subject<LoginOutput>();
    const resending = new Subject<LoginOutput>();
    mockAuthService.mfaVerify.mockReturnValue(verifying);
    mockAuthService.mfaResend.mockReturnValue(resending);

    store.mfaVerify({ preAuthToken: 'mfa-token', code: '000000' });
    expect(store.isVerifyingMfa()).toBe(true);
    expect(store.mfaVerifyError()).toBeNull();
    verifying.error({ '@type': 'Error', status: 422, detail: 'Code rejected.' });
    expect(store.isVerifyingMfa()).toBe(false);
    expect(store.mfaVerifyError()).toMatchObject({ code: 422 });

    store.mfaResend();
    expect(store.isResendingMfa()).toBe(true);
    expect(store.mfaResendError()).toBeNull();
    resending.error({ '@type': 'Error', status: 503, detail: 'Delivery unavailable.' });
    expect(store.isResendingMfa()).toBe(false);
    expect(store.mfaResendError()).toMatchObject({ code: 503 });
    expect(store.isAuthenticated()).toBe(false);
  });

  it('applies an external session and exposes renewal and logout progress until completion', () => {
    store.applySession(loginResponse);
    expect(store.accessToken()).toBe('access-token');
    expect(store.isAuthenticated()).toBe(true);
    expect(mockUserProfilePort.load).toHaveBeenCalledOnce();
    const refreshing = new Subject<LoginOutput>();
    const loggingOut = new Subject<LogoutOutput>();
    mockAuthService.refresh.mockReturnValue(refreshing);
    mockAuthService.logout.mockReturnValue(loggingOut);

    store.refresh();
    expect(store.isRefreshing()).toBe(true);
    refreshing.next(loginResponse);
    refreshing.complete();
    expect(store.isRefreshing()).toBe(false);

    store.logout();
    expect(store.isLoggingOut()).toBe(true);
    loggingOut.next({ '@id': '/api/auth/logout', '@type': 'Logout', message: 'Signed out.' });
    loggingOut.complete();
    expect(store.isLoggingOut()).toBe(false);
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
    expect(mockUserProfilePort.load).toHaveBeenCalledTimes(1);
  });

  it('should store MFA state when login requires MFA', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: null,
      expires_in: null,
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
    expect(mockUserProfilePort.load).not.toHaveBeenCalled();
  });

  it('should dispatch an event on login error', async () => {
    mockAuthService.login.mockReturnValue(throwError(() => new Error('Invalid credentials')));

    store.login(credentials);
    await flushEffects();

    expect(store.loginCallState().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('shows translated validation messages without the API property path', async () => {
    mockAuthService.login.mockReturnValue(
      throwError(() => ({
        status: 422,
        detail: 'password: Le mot de passe doit contenir au moins 8 caractères.',
        violations: [
          {
            propertyPath: 'password',
            message: 'Le mot de passe doit contenir au moins 8 caractères.',
          },
        ],
      })),
    );

    store.login(credentials);
    await flushEffects();

    expect(store.loginError()?.message).toBe(
      'Le mot de passe doit contenir au moins 8 caractères.',
    );
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          message: 'Le mot de passe doit contenir au moins 8 caractères.',
        }),
      }),
    );
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
      access_token: null,
      expires_in: null,
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
    expect(mockUserProfilePort.load).toHaveBeenCalledTimes(1);
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
    mockUserProfilePort.clear.mockClear();

    store.logout();
    await flushEffects();

    expect(store.logoutCallState().status).toBe('success');
    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBeNull();
    expect(mockTrustedDeviceStore.clear).toHaveBeenCalledTimes(1);
    expect(mockUserProfilePort.clear).toHaveBeenCalledTimes(1);
    expect(dispatchedTypes(mockDispatcher)).toEqual([
      authStoreEvents.sessionEnded.type,
      authStoreEvents.logoutSucceeded.type,
    ]);
  });

  it('should clear state and dispatch an event on logout error', async () => {
    mockAuthService.logout.mockReturnValue(throwError(() => new Error('Network error')));
    store.setToken('access-token', 3600);
    mockUserProfilePort.clear.mockClear();

    store.logout();
    await flushEffects();

    expect(store.logoutCallState().status).toBe('error');
    expect(store.initialized()).toBe(true);
    expect(store.accessToken()).toBeNull();
    expect(mockTrustedDeviceStore.clear).toHaveBeenCalledTimes(1);
    expect(mockUserProfilePort.clear).toHaveBeenCalledTimes(1);
    // A failed logout still ends the local session, so `sessionEnded` must fire on
    // this branch too — that is what purges the other users' data downstream.
    expect(dispatchedTypes(mockDispatcher)).toEqual([
      authStoreEvents.sessionEnded.type,
      authStoreEvents.logoutFailed.type,
    ]);
  });

  it('should resend MFA code and update tokens when MFA token is present', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: null,
      expires_in: null,
      mfa_required: true,
      mfa_token: 'mfa-token',
      challenge_token: 'challenge-token',
    };
    const resendResponse: LoginOutput = {
      ...loginResponse,
      access_token: null,
      expires_in: null,
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

  it('should memorize the resend cooldown announced by a successful resend', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: null,
      expires_in: null,
      mfa_required: true,
      mfa_token: 'mfa-token',
      mfa_resend_in: 60,
    };
    mockAuthService.login.mockReturnValue(of(mfaResponse));

    store.login(credentials);
    await flushEffects();

    expect(store.mfaResendAvailableIn()).toBeGreaterThan(0);
    expect(store.mfaResendAvailableIn()).toBeLessThanOrEqual(60);
  });

  it('should memorize the structured retry delay from a 429 resend refusal', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: null,
      expires_in: null,
      mfa_required: true,
      mfa_token: 'mfa-token',
    };
    mockAuthService.login.mockReturnValue(of(mfaResponse));
    mockAuthService.mfaResend.mockReturnValue(
      throwError(() => ({
        '@type': 'hydra:Error',
        status: 429,
        code: 'rate_limit_exceeded',
        retryAfterSeconds: 42,
        detail: 'Réessayez plus tard.',
      })),
    );

    store.login(credentials);
    await flushEffects();
    store.mfaResend();
    await flushEffects();

    expect(store.mfaResendCallState().status).toBe('error');
    expect(store.mfaResendAvailableIn()).toBeGreaterThan(0);
    expect(store.mfaResendAvailableIn()).toBeLessThanOrEqual(42);
  });

  it('should clear the resend cooldown with the MFA state', async () => {
    const mfaResponse: LoginOutput = {
      ...loginResponse,
      access_token: null,
      expires_in: null,
      mfa_required: true,
      mfa_token: 'mfa-token',
      mfa_resend_in: 60,
    };
    mockAuthService.login.mockReturnValue(of(mfaResponse));

    store.login(credentials);
    await flushEffects();
    store.clearMfaState();

    expect(store.mfaResendAvailableIn()).toBe(0);
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

  it('keeps an established session while its expired bearer awaits renewal', () => {
    store.setToken('expired-token', -1);

    expect(store.isAuthenticated()).toBe(true);
  });

  it('evaluates the expiry warning at call time without expiring the local session', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      store.setToken('token', 600);
      expect(store.isTokenExpiringSoon()).toBe(false);
      now.mockReturnValue(1_400_000);
      expect(store.isTokenExpiringSoon()).toBe(true);
      now.mockReturnValue(1_700_000);
      expect(store.isAuthenticated()).toBe(true);
    } finally {
      now.mockRestore();
    }
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
      access_token: null,
      expires_in: null,
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
      access_token: null,
      expires_in: null,
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
    expect(mockTrustedDeviceStore.clear).toHaveBeenCalledTimes(1);
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
      access_token: null,
      expires_in: null,
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

  it('should dispatch sessionEnded when the session is dropped without a logout call', () => {
    store.setToken('access-token', 3600);
    mockDispatcher.dispatch.mockClear();

    store.clearToken();

    // `clearToken` backs the 401 interceptor and "switch account". Both end a
    // session, so the stores and offline databases holding the departing user's
    // data must be purged just as they are on a real logout.
    expect(store.accessToken()).toBeNull();
    expect(dispatchedTypes(mockDispatcher)).toEqual([authStoreEvents.sessionEnded.type]);
  });

  describe('renewSession', () => {
    it('invalidates a refused renewal after its callers can end the originating session', async () => {
      store.setToken('expired', 1);
      const revision = store.sessionRevision();
      mockAuthService.refresh.mockReturnValue(throwError(() => new Error('revoked')));
      let revisionAtRefusal: number | undefined;
      store.renewSession().subscribe((token) => {
        expect(token).toBeNull();
        revisionAtRefusal = store.sessionRevision();
      });
      expect(revisionAtRefusal).toBe(revision);
      expect(store.sessionRevision()).toBe(revision + 1);
      expect(store.initialized()).toBe(true);
      expect(store.isAuthenticated()).toBe(false);
      expect(store.refreshCallState().status).toBe('error');
    });

    it('finishes bootstrap readiness when a new session supersedes restoration', async () => {
      const restoration = new Subject<LoginOutput>();
      mockAuthService.refresh.mockReturnValue(restoration);
      const startup = store.initialize();
      store.applySession(loginResponse);
      await startup;
      expect(restoration.observed).toBe(false);
      expect(store.initialized()).toBe(true);
      expect(store.isAuthenticated()).toBe(true);
      expect(mockUserProfilePort.load).toHaveBeenCalledOnce();
      expect(mockUserProfilePort.initialize).not.toHaveBeenCalled();
    });

    it('cancels old MFA verification when a replacement challenge is established', () => {
      const verification = new Subject<LoginOutput>();
      mockAuthService.mfaVerify.mockReturnValue(verification);
      store.applySession({
        mfa_required: true,
        mfa_token: 'challenge-a',
        challenge_token: 'a',
      } as LoginOutput);
      store.mfaVerify({ preAuthToken: 'challenge-a', code: '123456' });
      const revision = store.sessionRevision();
      store.applySession({
        mfa_required: true,
        mfa_token: 'challenge-b',
        challenge_token: 'b',
      } as LoginOutput);
      expect(store.sessionRevision()).toBeGreaterThan(revision);
      expect(verification.observed).toBe(false);
      verification.next(loginResponse);
      expect(store.accessToken()).toBeNull();
      expect(store.mfaToken()).toBe('challenge-b');
      expect(store.isVerifyingMfa()).toBe(false);
      mockAuthService.mfaVerify.mockReturnValue(of(loginResponse));
      store.mfaVerify({ preAuthToken: 'challenge-b', code: '654321' });
      expect(store.isAuthenticated()).toBe(true);
    });

    it('settles cancelled renewal callers and immediately accepts a new session renewal', async () => {
      const oldResponse = new Subject<LoginOutput>();
      const currentResponse = new Subject<LoginOutput>();
      mockAuthService.refresh.mockReturnValueOnce(oldResponse).mockReturnValueOnce(currentResponse);
      store.setToken('old', 3600);
      const revision = store.sessionRevision();
      const old = firstValueFrom(store.renewSession());
      store.clearToken();
      expect(await old).toBeNull();
      store.setToken('new', 3600);
      const currentRevision = store.sessionRevision();
      expect(currentRevision).toBeGreaterThan(revision);
      const current = firstValueFrom(store.renewSession());
      oldResponse.error(new Error('late old failure'));
      expect(store.accessToken()).toBe('new');
      expect(store.isRefreshing()).toBe(true);
      currentResponse.next(loginResponse);
      currentResponse.complete();
      expect(await current).toBe('access-token');
      expect(store.sessionRevision()).toBe(currentRevision);
    });

    it('shares initialization, refresh and interceptor renewal in one generation', async () => {
      const response = new Subject<LoginOutput>();
      mockAuthService.refresh.mockReturnValue(response);
      const initialization = store.initialize();
      store.refresh();
      const renewal = firstValueFrom(store.renewSession());
      expect(mockAuthService.refresh).toHaveBeenCalledOnce();
      response.next(loginResponse);
      response.complete();
      await initialization;
      expect(await renewal).toBe('access-token');
      expect(store.initialized()).toBe(true);
      expect(mockUserProfilePort.initialize).toHaveBeenCalledOnce();
    });

    it('does not bootstrap an old profile after initialization is invalidated', async () => {
      const response = new Subject<LoginOutput>();
      mockAuthService.refresh.mockReturnValue(response);
      const initialization = store.initialize();
      store.clearToken();
      response.next(loginResponse);
      response.complete();
      await initialization;
      expect(store.accessToken()).toBeNull();
      expect(store.initialized()).toBe(true);
      expect(mockUserProfilePort.initialize).not.toHaveBeenCalled();
    });

    it('does not subscribe to a renewal captured before session invalidation', async () => {
      const renewal = store.renewSession();
      store.clearToken();
      expect(await firstValueFrom(renewal)).toBeNull();
      expect(mockAuthService.refresh).not.toHaveBeenCalled();
    });

    it('ignores login and MFA responses after local session clearing', () => {
      const login = new Subject<LoginOutput>();
      mockAuthService.login.mockReturnValue(login);
      store.login(credentials);
      store.clearToken();
      login.next(loginResponse);
      expect(store.accessToken()).toBeNull();
      expect(store.isLoggingIn()).toBe(false);
      const mfa = new Subject<LoginOutput>();
      mockAuthService.mfaVerify.mockReturnValue(mfa);
      store.mfaVerify({ preAuthToken: 'old', code: '123456' });
      store.clearToken();
      mfa.next(loginResponse);
      expect(store.accessToken()).toBeNull();
      expect(mockUserProfilePort.load).not.toHaveBeenCalled();
    });

    it('does not clear a replacement session after an old logout response', () => {
      const logout = new Subject<LogoutOutput>();
      mockAuthService.logout.mockReturnValue(logout);
      store.setToken('old', 3600);
      store.logout();
      store.setToken('replacement', 3600);
      mockDispatcher.dispatch.mockClear();
      logout.next({ '@id': '/api/auth/logout', '@type': 'Logout', message: 'Signed out' });
      expect(store.accessToken()).toBe('replacement');
      expect(store.isLoggingOut()).toBe(false);
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('should return the new access token and apply it', async () => {
      mockAuthService.refresh.mockReturnValue(of(loginResponse));

      const token = await firstValueFrom(store.renewSession());

      expect(token).toBe('access-token');
      expect(store.accessToken()).toBe('access-token');
      expect(store.refreshCallState().status).toBe('success');
    });

    it('should resolve to null and drop the token when renewal fails', async () => {
      mockAuthService.refresh.mockReturnValue(throwError(() => new Error('expired')));

      const token = await firstValueFrom(store.renewSession());

      expect(token).toBeNull();
      expect(store.accessToken()).toBeNull();
      expect(store.refreshCallState().status).toBe('error');
    });

    it('should share one request between concurrent callers', async () => {
      // Must be asynchronous to model a real request: a synchronous source
      // completes before the second caller ever arrives, which would hide the
      // very overlap this guards against.
      mockAuthService.refresh.mockReturnValue(of(loginResponse).pipe(delay(1)));

      const [first, second] = await Promise.all([
        firstValueFrom(store.renewSession()),
        firstValueFrom(store.renewSession()),
      ]);

      // The refresh token rotates server-side: firing two refreshes at once looks
      // like replay and can invalidate the session outright.
      expect(mockAuthService.refresh).toHaveBeenCalledTimes(1);
      expect(first).toBe('access-token');
      expect(second).toBe('access-token');
    });

    it('should start a new request once the previous one settled', async () => {
      mockAuthService.refresh.mockReturnValue(of(loginResponse));

      await firstValueFrom(store.renewSession());
      await firstValueFrom(store.renewSession());

      expect(mockAuthService.refresh).toHaveBeenCalledTimes(2);
    });
  });
});
