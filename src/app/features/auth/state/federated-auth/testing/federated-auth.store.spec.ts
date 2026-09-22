import {
  makeStateKey,
  PLATFORM_ID,
  signal,
  TransferState,
  type WritableSignal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { FederatedAuthService } from '@features/auth/data-access';
import type {
  FederatedConnectionsOutput,
  FederatedProviderOutput,
  FederatedStartOutput,
  LoginOutput,
  PasswordSetupChallengeOutput,
  PasswordSetupConfirmOutput,
} from '@features/auth/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { FederatedReturnContextService } from '@features/auth/services';
import { authStoreEvents } from '../../auth';
import { FederatedAuthStore } from '../federated-auth.store';

describe('FederatedAuthStore', () => {
  let store: FederatedAuthStore;
  let sessionRevision: WritableSignal<number>;
  let service: {
    completeLink: ReturnType<typeof vi.fn>;
    completeLogin: ReturnType<typeof vi.fn>;
    connections: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    startLogin: ReturnType<typeof vi.fn>;
    startLink: ReturnType<typeof vi.fn>;
    providers: ReturnType<typeof vi.fn>;
    requestPasswordSetup: ReturnType<typeof vi.fn>;
    confirmPasswordSetup: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sessionRevision = signal(0);
    service = {
      completeLink: vi.fn(),
      completeLogin: vi.fn(),
      connections: vi.fn(),
      disconnect: vi.fn(),
      startLogin: vi.fn(),
      startLink: vi.fn(),
      providers: vi.fn(),
      requestPasswordSetup: vi.fn(),
      confirmPasswordSetup: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AUTH_SESSION_PORT, useValue: { sessionRevision } },
        { provide: FederatedAuthService, useValue: service },
      ],
    });
    store = TestBed.inject(FederatedAuthStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should expose and consume one login callback result', async () => {
    const result = {
      '@id': '/api/auth/federated/google/complete',
      '@type': 'Token',
      token_type: 'Bearer',
      mfa_required: true,
      mfa_token: 'pre-auth-token',
      challenge_token: 'challenge-token',
      mfa_method: 'email',
      mfa_destination: 'a***n@example.com',
      mfa_resend_in: 30,
    } satisfies LoginOutput;
    service.completeLogin.mockReturnValue(of(result));

    store.completeLogin({ provider: 'google', input: { code: 'code', state: 'state' } });
    await Promise.resolve();

    expect(store.completeLoginResult()).toEqual(result);
    store.resetCompleteLogin();
    expect(store.completeLoginResult()).toBeNull();
    expect(store.pendingProvider()).toBeNull();
  });

  it('should keep link completion separate from connection loading', async () => {
    const connections = {
      '@id': '/api/auth/federated/connections',
      '@type': 'FederatedConnections',
      password_configured: true,
      last_sign_in_method: 'google',
      connections: [],
    } satisfies FederatedConnectionsOutput;
    service.completeLink.mockReturnValue(of(connections));

    store.completeLink({ provider: 'google', input: { code: 'code', state: 'state' } });
    await Promise.resolve();

    expect(store.completeLinkCallState().status).toBe('success');
    expect(store.connectionsCallState().status).toBe('idle');
    expect(store.connections()).toEqual(connections);
    store.resetCompleteLink();
    expect(store.completeLinkCallState().status).toBe('idle');
  });

  it('should keep password availability unknown until connections load', () => {
    expect(store.passwordConfigured()).toBeNull();
  });

  it('should clear account-specific federation state when the session ends', async () => {
    const connections = {
      '@id': '/api/auth/federated/connections',
      '@type': 'FederatedConnections',
      password_configured: true,
      last_sign_in_method: 'google',
      connections: [
        {
          provider: 'google',
          email: 'previous@example.com',
          connected_at: '2026-09-06T10:00:00+00:00',
          last_used_at: '2026-09-06T10:00:00+00:00',
        },
      ],
    } satisfies FederatedConnectionsOutput;
    service.completeLink.mockReturnValue(of(connections));
    store.completeLink({ provider: 'google', input: { code: 'code', state: 'state' } });
    await Promise.resolve();

    TestBed.inject(Dispatcher).dispatch(authStoreEvents.sessionEnded());

    expect(store.connections()).toBeNull();
    expect(store.completeLinkCallState().status).toBe('idle');
    expect(store.passwordConfigured()).toBeNull();
  });

  it('should reset one-time password setup state', () => {
    store.resetPasswordSetup();

    expect(store.passwordSetupRequestCallState().status).toBe('idle');
    expect(store.passwordSetupConfirmCallState().status).toBe('idle');
  });

  it('should cancel a pending redirect start when its state is reset', async () => {
    const result = new Subject<FederatedStartOutput>();
    service.startLogin.mockReturnValue(result);

    store.startLogin({ provider: 'google', returnUrl: '/' });
    expect(store.startCallState().status).toBe('pending');

    store.resetStart();
    result.next({
      '@id': '/api/auth/federated/google/start',
      '@type': 'FederatedStart',
      authorization_url: 'https://accounts.google.com/authorize',
    });
    await Promise.resolve();

    expect(store.startCallState().status).toBe('idle');
    expect(store.startUrl()).toBeNull();
  });

  it.each([
    ['//external.example/path', '/'],
    ['/auth/federated/google/callback?code=secret&state=secret', '/'],
    ['/account/security/federated/google/callback?code=secret&state=secret', '/account/security'],
    [
      '/organizations/invitations/accept?token=invitation-intent',
      '/organizations/invitations/accept?token=invitation-intent',
    ],
  ])('validates the destination before starting the provider flow: %s', (returnUrl, expected) => {
    service.startLogin.mockReturnValue(
      of({
        '@id': '/api/auth/federated/google/start',
        '@type': 'FederatedStart',
        authorization_url: 'https://accounts.google.com/authorize',
      } satisfies FederatedStartOutput),
    );

    store.startLogin({ provider: 'google', returnUrl });
    expect(service.startLogin).toHaveBeenCalledWith('google', { return_url: expected });
  });

  it('purges abandoned federated return intent when the session ends', () => {
    const returnContext = TestBed.inject(FederatedReturnContextService);
    const clear = vi.spyOn(returnContext, 'clear');

    TestBed.inject(Dispatcher).dispatch(authStoreEvents.sessionEnded());

    expect(clear).toHaveBeenCalledOnce();
  });

  it('should use the disconnect response as the updated connection state', async () => {
    const connections = {
      '@id': '/api/auth/federated/connections',
      '@type': 'FederatedConnections',
      password_configured: true,
      last_sign_in_method: 'password',
      connections: [],
    } satisfies FederatedConnectionsOutput;
    service.disconnect.mockReturnValue(of(connections));

    store.disconnect('google');
    await Promise.resolve();

    expect(service.connections).not.toHaveBeenCalled();
    expect(store.connections()).toEqual(connections);
    expect(store.disconnectCallState().status).toBe('success');
  });

  const providers: FederatedProviderOutput[] = [
    {
      '@id': '/api/auth/federated/providers/google',
      '@type': 'FederatedProvider',
      provider: 'google',
      enabled: true,
    },
    {
      '@id': '/api/auth/federated/providers/microsoft',
      '@type': 'FederatedProvider',
      provider: 'microsoft',
      enabled: false,
    },
  ];
  const connections: FederatedConnectionsOutput = {
    '@id': '/api/auth/federated/connections',
    '@type': 'FederatedConnections',
    password_configured: false,
    last_sign_in_method: 'google',
    connections: [
      {
        provider: 'google',
        email: 'member@example.com',
        connected_at: '2026-09-22T00:00:00Z',
        last_used_at: '2026-09-22T00:00:00Z',
      },
    ],
  };
  const failure = {
    '@type': 'Error',
    status: 503,
    detail: 'Temporarily unavailable',
    code: 'temporarily_unavailable',
  };

  it('loads only enabled sign-in choices and retains availability after a failed refresh', () => {
    const pending = new Subject<HydraCollection<FederatedProviderOutput>>();
    service.providers.mockReturnValue(pending);

    store.loadProviders();
    expect(store.providersLoading()).toBe(true);
    pending.next({
      '@id': '/api/auth/federated/providers',
      '@type': 'Collection',
      member: providers,
      totalItems: 2,
    });
    pending.complete();

    expect(store.enabledProviders()).toEqual(['google']);
    expect(store.providersLoading()).toBe(false);

    service.providers.mockReturnValue(throwError(() => failure));
    store.loadProviders();

    expect(store.providersCallState()).toMatchObject({
      status: 'error',
      error: { code: 503 },
      data: providers,
    });
    expect(store.enabledProviders()).toEqual(['google']);
  });

  it('consumes the SSR provider handoff once before making later network reads', () => {
    const key = makeStateKey<readonly FederatedProviderOutput[]>('auth-federated-providers');
    const transfer = TestBed.inject(TransferState);
    transfer.set(key, providers);

    store.loadProviders();

    expect(store.enabledProviders()).toEqual(['google']);
    expect(transfer.hasKey(key)).toBe(false);
    expect(service.providers).not.toHaveBeenCalled();

    service.providers.mockReturnValue(of({ member: [], totalItems: 0 }));
    store.loadProviders();
    expect(service.providers).toHaveBeenCalledOnce();
    expect(store.enabledProviders()).toEqual([]);
  });

  it('serializes public provider availability during SSR without serializing account connections', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: AUTH_SESSION_PORT, useValue: { sessionRevision } },
        { provide: FederatedAuthService, useValue: service },
      ],
    });
    store = TestBed.inject(FederatedAuthStore);
    service.providers.mockReturnValue(of({ member: providers, totalItems: 2 }));

    store.loadProviders();

    const serialized = JSON.parse(TestBed.inject(TransferState).toJson()) as Record<
      string,
      unknown
    >;
    expect(serialized).toEqual({ 'auth-federated-providers': providers });
    expect(service.connections).not.toHaveBeenCalled();
  });

  it('normalizes failed sign-in starts and callback completion independently', () => {
    service.startLogin.mockReturnValue(throwError(() => failure));
    service.completeLogin.mockReturnValue(throwError(() => failure));

    store.startLogin({ provider: 'google', returnUrl: '/organizations' });
    expect(store.startPending()).toBe(false);
    expect(store.startUrl()).toBeNull();
    expect(store.startCallState()).toMatchObject({ status: 'error', error: { code: 503 } });

    store.completeLogin({ provider: 'google', input: { error: 'access_denied', state: 'state' } });

    expect(service.completeLogin).toHaveBeenCalledWith('google', {
      error: 'access_denied',
      state: 'state',
    });
    expect(store.completeLoginError()).toMatchObject({ code: 503 });
    expect(store.completeLoginResult()).toBeNull();
  });

  it('keeps known connections during pending and failed refreshes', () => {
    service.connections.mockReturnValue(of(connections));
    store.loadConnections();
    expect(store.passwordConfigured()).toBe(false);

    const pending = new Subject<FederatedConnectionsOutput>();
    service.connections.mockReturnValue(pending);
    store.loadConnections();

    expect(store.connectionsLoading()).toBe(true);
    expect(store.connections()).toEqual(connections);
    pending.error(failure);

    expect(store.connectionsLoading()).toBe(false);
    expect(store.connectionsError()).toMatchObject({ code: 503 });
    expect(store.connectionsCallState().data).toEqual(connections);
  });

  it('starts authenticated linking and exposes a failure after resetting a completed redirect', () => {
    const redirect: FederatedStartOutput = {
      '@id': '/api/auth/federated/microsoft/link',
      '@type': 'FederatedStart',
      authorization_url: 'https://login.microsoftonline.com/authorize',
    };
    service.startLink.mockReturnValue(of(redirect));

    store.startLink('microsoft');
    expect(service.startLink).toHaveBeenCalledWith('microsoft');
    expect(store.startUrl()).toBe(redirect.authorization_url);
    expect(store.pendingProvider()).toBe('microsoft');
    store.resetStart();

    service.startLink.mockReturnValue(throwError(() => failure));
    store.startLink('microsoft');
    expect(store.startCallState()).toMatchObject({ status: 'error', error: { code: 503 } });
    expect(store.startUrl()).toBeNull();
  });

  it('preserves existing connections when linking or disconnecting is refused', () => {
    service.connections.mockReturnValue(of(connections));
    service.completeLink.mockReturnValue(throwError(() => failure));
    service.disconnect.mockReturnValue(throwError(() => failure));
    store.loadConnections();

    store.completeLink({ provider: 'microsoft', input: { code: 'code', state: 'state' } });
    expect(store.completeLinkError()).toMatchObject({ code: 503 });
    expect(store.completeLinkCallState().data).toEqual(connections);

    store.disconnect('google');
    expect(store.disconnectCallState()).toMatchObject({ status: 'error', error: { code: 503 } });
    expect(store.connections()).toEqual(connections);
    store.resetDisconnect();
    expect(store.disconnectCallState().status).toBe('idle');
    expect(store.pendingProvider()).toBeNull();
  });

  it('exposes a first-password challenge and confirms password availability only after success', () => {
    const challenge: PasswordSetupChallengeOutput = {
      '@id': '/api/auth/password/setup/request',
      '@type': 'PasswordSetupChallenge',
      success: true,
      message: 'Code sent',
      challengeToken: 'challenge',
      maskedRecipient: 'm***@example.com',
      expiresAt: '2026-09-22T00:10:00Z',
      maxAttempts: 5,
    };
    const confirmation: PasswordSetupConfirmOutput = {
      '@id': '/api/auth/password/setup/confirm',
      '@type': 'PasswordSetupConfirm',
      success: true,
      message: 'Password configured',
      errorCode: null,
      attemptsRemaining: 5,
    };
    const pending = new Subject<PasswordSetupConfirmOutput>();
    service.connections.mockReturnValue(of(connections));
    service.requestPasswordSetup.mockReturnValue(of(challenge));
    service.confirmPasswordSetup.mockReturnValue(pending);
    store.loadConnections();
    store.requestPasswordSetup();
    expect(store.passwordSetupChallenge()).toBe('challenge');

    const input = { token: 'challenge', code: '123456', newPassword: 'NewPassword123!' };
    store.confirmPasswordSetup(input);
    expect(service.confirmPasswordSetup).toHaveBeenCalledWith(input);
    expect(store.passwordSetupConfirmCallState().status).toBe('pending');
    expect(store.passwordConfigured()).toBe(false);
    pending.next(confirmation);
    pending.complete();

    expect(store.passwordConfigured()).toBe(true);
    expect(store.connections()?.connections).toEqual(connections.connections);
    expect(store.passwordSetupConfirmCallState().data).toEqual(confirmation);
    store.resetPasswordSetup();
    expect(store.passwordSetupChallenge()).toBeNull();
    expect(store.passwordSetupConfirmCallState().status).toBe('idle');
  });

  it('keeps password availability unknown when confirmation succeeds before connections load', () => {
    service.confirmPasswordSetup.mockReturnValue(of({ success: true }));
    store.confirmPasswordSetup({
      token: 'challenge',
      code: '123456',
      newPassword: 'NewPassword123!',
    });

    expect(store.passwordConfigured()).toBeNull();
    expect(store.passwordSetupConfirmCallState().status).toBe('success');
  });

  it('does not enable a password when the submitted code is rejected', () => {
    service.connections.mockReturnValue(of(connections));
    service.confirmPasswordSetup.mockReturnValue(
      of({ success: false, errorCode: 'invalid_code', attemptsRemaining: 4 }),
    );
    store.loadConnections();
    store.confirmPasswordSetup({
      token: 'challenge',
      code: '000000',
      newPassword: 'NewPassword123!',
    });

    expect(store.passwordConfigured()).toBe(false);
    expect(store.passwordSetupConfirmCallState().data).toMatchObject({
      success: false,
      attemptsRemaining: 4,
    });
  });

  it('normalizes request and confirmation failures without losing account connections', () => {
    service.connections.mockReturnValue(of(connections));
    service.requestPasswordSetup.mockReturnValue(throwError(() => failure));
    service.confirmPasswordSetup.mockReturnValue(throwError(() => failure));
    store.loadConnections();

    store.requestPasswordSetup();
    expect(store.passwordSetupRequestCallState()).toMatchObject({
      status: 'error',
      error: { code: 503 },
    });
    expect(store.passwordSetupChallenge()).toBeNull();

    store.confirmPasswordSetup({
      token: 'challenge',
      code: '123456',
      newPassword: 'NewPassword123!',
    });
    expect(store.passwordSetupConfirmCallState()).toMatchObject({
      status: 'error',
      error: { code: 503 },
    });
    expect(store.connections()).toEqual(connections);
  });

  it('ignores late account results and redirects after sign-out', () => {
    const pendingConnections = new Subject<FederatedConnectionsOutput>();
    const pendingLink = new Subject<FederatedStartOutput>();
    service.connections.mockReturnValue(pendingConnections);
    service.startLink.mockReturnValue(pendingLink);
    store.loadConnections();
    store.startLink('google');

    TestBed.inject(Dispatcher).dispatch(authStoreEvents.sessionEnded());
    pendingConnections.next(connections);
    pendingLink.next({
      '@id': '/api/auth/federated/google/link',
      '@type': 'FederatedStart',
      authorization_url: 'https://accounts.google.com/authorize',
    });

    expect(store.connections()).toBeNull();
    expect(store.connectionsCallState().status).toBe('idle');
    expect(store.startUrl()).toBeNull();
    expect(store.pendingProvider()).toBeNull();
  });
  it('ignores completion from a replaced session and can exchange another callback after reset', () => {
    const previous = new Subject<LoginOutput>();
    const result = {
      '@id': '/api/auth/federated/google/complete',
      '@type': 'Token',
      access_token: 'new-token',
    } as LoginOutput;
    service.completeLogin.mockReturnValueOnce(previous).mockReturnValueOnce(of(result));
    store.completeLogin({ provider: 'google', input: { code: 'old', state: 'old' } });
    sessionRevision.set(1);
    previous.next(result);
    previous.complete();
    expect(store.completeLoginResult()).toBeNull();
    store.resetCompleteLogin();
    store.completeLogin({ provider: 'google', input: { code: 'current', state: 'current' } });
    expect(store.completeLoginResult()).toEqual(result);
  });

  it('cancels pending callback completion on session clear without destroying its stream', () => {
    const previous = new Subject<LoginOutput>();
    const current = new Subject<LoginOutput>();
    service.completeLogin.mockReturnValueOnce(previous).mockReturnValueOnce(current);
    store.completeLogin({ provider: 'google', input: { code: 'old', state: 'old' } });
    TestBed.inject(Dispatcher).dispatch(authStoreEvents.sessionEnded());
    expect(previous.observed).toBe(false);
    expect(store.completeLoginCallState().status).toBe('idle');
    store.completeLogin({ provider: 'google', input: { code: 'current', state: 'current' } });
    previous.error(new Error('Obsolete'));
    expect(current.observed).toBe(true);
    expect(store.completeLoginCallState().status).toBe('pending');
  });
});
