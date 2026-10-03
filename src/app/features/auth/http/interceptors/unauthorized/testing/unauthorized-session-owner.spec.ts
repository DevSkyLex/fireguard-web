import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment';
import { USER_PROFILE_PORT } from '@features/account/ports';
import { AuthService } from '@features/auth/data-access';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { AuthSessionNavigationService } from '@features/auth/services';
import { SessionCoordinationService } from '@features/auth/services/session-coordination/session-coordination.service';
import { AuthStore } from '@features/auth/state/auth/auth.store';
import { ActiveTrustedDeviceStore } from '@features/auth/state/trusted-device';
import { authInterceptor } from '../../auth/auth.interceptor';
import { unauthorizedInterceptor } from '../unauthorized.interceptor';

const tokenFor = (owner: string): string =>
  `header.${btoa(JSON.stringify({ sub: owner }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')}.signature`;

describe('401 replay ownership with real AuthStore', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let store: AuthStore;
  let refresh: ReturnType<typeof vi.fn>;
  let remoteInvalidation: () => void;
  beforeEach(() => {
    refresh = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, unauthorizedInterceptor])),
        provideHttpClientTesting(),
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.fireguard.test' } },
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: AuthService, useValue: { refresh } },
        {
          provide: USER_PROFILE_PORT,
          useValue: { clear: vi.fn(), load: vi.fn(), initialize: vi.fn() },
        },
        { provide: ActiveTrustedDeviceStore, useValue: { clear: vi.fn() } },
        { provide: AuthSessionNavigationService, useValue: { navigateToLogin: vi.fn() } },
        {
          provide: SessionCoordinationService,
          useValue: {
            publish: vi.fn(),
            subscribe: (listener: () => void): (() => void) => {
              remoteInvalidation = listener;
              return (): void => undefined;
            },
          },
        },
        {
          provide: AUTH_SESSION_PORT,
          useFactory: (auth: AuthStore) => ({
            accessToken: auth.accessToken,
            sessionRevision: auth.sessionRevision,
            initialized: auth.initialized,
            isAuthenticated: auth.isAuthenticated,
            clearSession: (): void => auth.clearToken(),
            renewSession: () => auth.renewSession(),
          }),
          deps: [AuthStore],
        },
      ],
    });
    store = TestBed.inject(AuthStore);
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    store.setToken(tokenFor('account-a'), 1);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it.each([tokenFor('account-b'), 'unreadable'])(
    'never replays an old command after a changed or unreadable refresh owner',
    (token) => {
      refresh.mockReturnValue(of({ access_token: token, expires_in: 3600 }));
      const error = vi.fn();
      client.post('/api/interventions', { privateDraft: 'account-a' }).subscribe({ error });
      const command = http.expectOne('/api/interventions');
      expect(command.request.headers.get('Authorization')).toBe(`Bearer ${tokenFor('account-a')}`);
      command.flush(null, { status: 401, statusText: 'Unauthorized' });
      http.expectNone('/api/interventions');
      expect(error).toHaveBeenCalledOnce();
      expect(store.isAuthenticated()).toBe(false);
    },
  );

  it('never replays an A command after remote invalidation and an A→B→A return', () => {
    const response = new Subject<{ access_token: string; expires_in: number }>();
    refresh.mockReturnValue(response);
    const error = vi.fn();
    client.post('/api/interventions', { privateDraft: 'old-a' }).subscribe({ error });
    http.expectOne('/api/interventions').flush(null, { status: 401, statusText: 'Unauthorized' });
    remoteInvalidation();
    store.setToken(tokenFor('account-b'), 3600);
    store.setToken(tokenFor('account-a'), 3600);
    response.next({ access_token: tokenFor('account-a'), expires_in: 3600 });
    http.expectNone('/api/interventions');
    expect(error).toHaveBeenCalledOnce();
    expect(store.accessToken()).toBe(tokenFor('account-a'));
  });
});
