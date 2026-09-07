import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject } from 'rxjs';
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
    completeLink: ReturnType<typeof vi.fn>;
    completeLogin: ReturnType<typeof vi.fn>;
    connections: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    startLogin: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      completeLink: vi.fn(),
      completeLogin: vi.fn(),
      connections: vi.fn(),
      disconnect: vi.fn(),
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
