import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { FederatedAuthService } from '@features/auth/data-access';
import type {
  FederatedConnectionsOutput,
  FederatedStartOutput,
  LoginOutput,
} from '@features/auth/models';
import { FederatedReturnContextService } from '@features/auth/services';
import { authStoreEvents } from '../../auth';
import { FederatedAuthStore } from '../federated-auth.store';

describe('FederatedAuthStore', () => {
  let store: FederatedAuthStore;
  let service: {
    confirmPasswordSetup: ReturnType<typeof vi.fn>;
    completeLink: ReturnType<typeof vi.fn>;
    completeLogin: ReturnType<typeof vi.fn>;
    connections: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    providers: ReturnType<typeof vi.fn>;
    requestPasswordSetup: ReturnType<typeof vi.fn>;
    startLink: ReturnType<typeof vi.fn>;
    startLogin: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      confirmPasswordSetup: vi.fn(),
      completeLink: vi.fn(),
      completeLogin: vi.fn(),
      connections: vi.fn(),
      disconnect: vi.fn(),
      providers: vi.fn(),
      requestPasswordSetup: vi.fn(),
      startLink: vi.fn(),
      startLogin: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
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

  it('loads public providers and exposes only enabled identities', async () => {
    service.providers.mockReturnValue(
      of({
        member: [
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
        ],
      }),
    );

    store.loadProviders();
    await Promise.resolve();

    expect(store.providersCallState().status).toBe('success');
    expect(store.enabledProviders()).toEqual(['google']);
    expect(store.providersLoading()).toBe(false);
  });

  it('reports provider discovery failures without inventing availability', async () => {
    service.providers.mockReturnValue(
      throwError(() => ({ '@type': 'Error', status: 503, detail: 'Unavailable' })),
    );

    store.loadProviders();
    await Promise.resolve();

    expect(store.providersCallState()).toMatchObject({ status: 'error', error: { code: 503 } });
    expect(store.enabledProviders()).toEqual([]);
  });

  it('loads account connections and preserves the last snapshot when refresh fails', async () => {
    const connections = {
      '@id': '/api/auth/federated/connections',
      '@type': 'FederatedConnections',
      password_configured: false,
      last_sign_in_method: 'google',
      connections: [],
    } satisfies FederatedConnectionsOutput;
    service.connections
      .mockReturnValueOnce(of(connections))
      .mockReturnValueOnce(
        throwError(() => ({ '@type': 'Error', status: 503, detail: 'Unavailable' })),
      );

    store.loadConnections();
    await Promise.resolve();
    expect(store.connections()).toEqual(connections);
    expect(store.connectionsLoading()).toBe(false);

    store.loadConnections();
    await Promise.resolve();
    expect(store.connections()).toEqual(connections);
    expect(store.connectionsError()).toMatchObject({ code: 503 });
  });

  it('starts an account link and resets the shared redirect state', async () => {
    service.startLink.mockReturnValue(
      of({
        '@id': '/api/auth/federated/google/link',
        '@type': 'FederatedStart',
        authorization_url: 'https://accounts.google.com/link',
      } satisfies FederatedStartOutput),
    );

    store.startLink('google');
    await Promise.resolve();
    expect(store.startUrl()).toBe('https://accounts.google.com/link');
    expect(store.pendingProvider()).toBe('google');
    store.resetStart();
    expect(store.startCallState().status).toBe('idle');
    expect(store.pendingProvider()).toBeNull();
  });

  it('requests and confirms first-password setup, updating the loaded connection snapshot', async () => {
    const connections = {
      '@id': '/api/auth/federated/connections',
      '@type': 'FederatedConnections',
      password_configured: false,
      last_sign_in_method: 'google',
      connections: [],
    } satisfies FederatedConnectionsOutput;
    service.completeLink.mockReturnValue(of(connections));
    service.requestPasswordSetup.mockReturnValue(
      of({
        '@id': '/api/auth/federated/password/setup',
        '@type': 'PasswordSetupChallenge',
        success: true,
        message: 'Code sent.',
        challengeToken: 'challenge-token',
        maskedRecipient: 'v***@example.com',
        expiresAt: '2026-09-22T19:00:00Z',
        maxAttempts: 5,
      }),
    );
    service.confirmPasswordSetup.mockReturnValue(
      of({
        '@id': '/api/auth/federated/password/confirm',
        '@type': 'PasswordSetupConfirm',
        success: true,
        message: 'Password configured.',
        errorCode: null,
        attemptsRemaining: 5,
      }),
    );
    store.completeLink({ provider: 'google', input: { code: 'code', state: 'state' } });

    store.requestPasswordSetup();
    await Promise.resolve();
    expect(store.passwordSetupChallenge()).toBe('challenge-token');
    store.confirmPasswordSetup({
      token: 'challenge-token',
      code: '123456',
      newPassword: 'NewPassword123!',
    });
    await Promise.resolve();

    expect(store.passwordSetupConfirmCallState().status).toBe('success');
    expect(store.passwordConfigured()).toBe(true);
  });

  it('keeps password state unchanged when setup is refused and exposes transport failures', async () => {
    service.requestPasswordSetup.mockReturnValue(
      throwError(() => ({ '@type': 'Error', status: 429, detail: 'Retry later' })),
    );
    service.confirmPasswordSetup.mockReturnValue(
      throwError(() => ({ '@type': 'Error', status: 422, detail: 'Invalid code' })),
    );

    store.requestPasswordSetup();
    await Promise.resolve();
    expect(store.passwordSetupRequestCallState()).toMatchObject({
      status: 'error',
      error: { code: 429 },
    });
    store.confirmPasswordSetup({
      token: 'challenge-token',
      code: '000000',
      newPassword: 'NewPassword123!',
    });
    await Promise.resolve();
    expect(store.passwordSetupConfirmCallState()).toMatchObject({
      status: 'error',
      error: { code: 422 },
    });
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
});
