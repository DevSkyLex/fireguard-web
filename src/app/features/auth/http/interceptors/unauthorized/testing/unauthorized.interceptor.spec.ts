import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { AuthSessionNavigationService } from '@features/auth/services';
import { unauthorizedInterceptor } from '../unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let sessionRevision: WritableSignal<number>;
  let mockSessionNavigation: { navigateToLogin: ReturnType<typeof vi.fn> };
  let mockSession: {
    clearSession: ReturnType<typeof vi.fn>;
    renewSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sessionRevision = signal(0);
    mockSessionNavigation = { navigateToLogin: vi.fn() };
    mockSession = { clearSession: vi.fn(), renewSession: vi.fn(() => of(null)) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthSessionNavigationService, useValue: mockSessionNavigation },
        {
          provide: AUTH_SESSION_PORT,
          useValue: {
            ...mockSession,
            sessionRevision,
            accessToken: signal<string | null>(null),
            isAuthenticated: signal(false),
            initialized: signal(true),
          },
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should NOT redirect on a 403 (handled by the caller via toast)', () => {
    httpClient.get('/api/protected').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/protected').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(mockSessionNavigation.navigateToLogin).not.toHaveBeenCalled();
    expect(mockSession.clearSession).not.toHaveBeenCalled();
  });

  it('should clear the session and redirect to login on a 401', () => {
    httpClient.get('/api/protected').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(mockSession.clearSession).toHaveBeenCalledTimes(1);
    expect(mockSessionNavigation.navigateToLogin).toHaveBeenCalledTimes(1);
  });

  it('should NOT handle a 401 on an excluded auth endpoint', () => {
    httpClient.post('/api/auth/login', {}).subscribe({ error: () => undefined });

    httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(mockSession.clearSession).not.toHaveBeenCalled();
    expect(mockSessionNavigation.navigateToLogin).not.toHaveBeenCalled();
  });

  it.each([
    ['/api/auth/mfa/verify', 'a mistyped MFA code'],
    ['/api/auth/mfa/resend', 'a resend on an expired challenge'],
    ['/api/auth/federated/providers', 'provider discovery is unavailable'],
    ['/api/auth/federated/google/start', 'Google sign-in cannot start'],
    ['/api/auth/federated/google/complete', 'Google rejects the callback'],
    ['/api/auth/federated/microsoft/start', 'Microsoft sign-in cannot start'],
    ['/api/auth/federated/microsoft/complete', 'Microsoft rejects the callback'],
    ['/api/auth/password/reset/request', 'an unknown reset address'],
    ['/api/auth/password/reset/confirm', 'a mistyped reset code'],
    ['/api/auth/password/reset/resend', 'a resend on an expired reset'],
    ['/api/me/password/request', 'a wrong current password'],
    ['/api/me/password/confirm', 'a mistyped password-change code'],
  ])('should NOT sign the user out when %s answers 401 (%s)', (url) => {
    httpClient.post(url, {}).subscribe({ error: () => undefined });

    httpMock.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' });

    // These endpoints answer 401 to mean "the value you supplied is wrong", not
    // "your session is gone". On /api/me/password/* the caller is authenticated,
    // so treating it as a dead session logged them out over a typo.
    expect(mockSession.clearSession).not.toHaveBeenCalled();
    expect(mockSessionNavigation.navigateToLogin).not.toHaveBeenCalled();
  });

  it('should still sign the user out on a 401 from a look-alike path', () => {
    httpClient.get('/api/me/password-history').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/me/password-history')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(mockSession.clearSession).toHaveBeenCalledTimes(1);
    expect(mockSessionNavigation.navigateToLogin).toHaveBeenCalledTimes(1);
  });

  describe('silent renewal', () => {
    it('does not renew or replay a request from an ended session', () => {
      const failed = vi.fn();
      httpClient.post('/api/protected', { command: 'old' }).subscribe({ error: failed });
      sessionRevision.set(2);
      httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(failed).toHaveBeenCalledOnce();
      expect(mockSession.renewSession).not.toHaveBeenCalled();
      expect(mockSession.clearSession).not.toHaveBeenCalled();
      expect(mockSessionNavigation.navigateToLogin).not.toHaveBeenCalled();
      httpMock.expectNone('/api/protected');
    });

    it.each(['new-token', null])('ignores renewal result %s after the session changes', (token) => {
      const renewal = new Subject<string | null>();
      mockSession.renewSession.mockReturnValue(renewal);
      const failed = vi.fn();
      httpClient.get('/api/protected').subscribe({ error: failed });
      httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });
      sessionRevision.set(1);
      renewal.next(token);
      renewal.complete();
      expect(failed).toHaveBeenCalledOnce();
      expect(mockSession.clearSession).not.toHaveBeenCalled();
      expect(mockSessionNavigation.navigateToLogin).not.toHaveBeenCalled();
      httpMock.expectNone('/api/protected');
    });

    it('does not clear a new session when the old replay returns 401', () => {
      mockSession.renewSession.mockReturnValue(of('renewed-token'));
      httpClient.get('/api/protected').subscribe({ error: () => undefined });
      httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });
      const replay = httpMock.expectOne('/api/protected');
      sessionRevision.set(2);
      replay.flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(mockSession.clearSession).not.toHaveBeenCalled();
      expect(mockSessionNavigation.navigateToLogin).not.toHaveBeenCalled();
    });

    it('should renew and replay the request instead of signing the user out', () => {
      mockSession.renewSession.mockReturnValue(of('fresh-token'));
      let body: unknown = null;
      httpClient.get('/api/protected').subscribe({ next: (value) => (body = value) });

      httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });

      const retried = httpMock.expectOne('/api/protected');
      // The bearer interceptor runs *before* this one, so the replay would carry
      // the expired token unless it is set here.
      expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
      retried.flush({ ok: true });

      expect(body).toEqual({ ok: true });
      expect(mockSession.clearSession).not.toHaveBeenCalled();
      expect(mockSessionNavigation.navigateToLogin).not.toHaveBeenCalled();
    });

    it('should sign the user out when the renewal itself fails', () => {
      mockSession.renewSession.mockReturnValue(of(null));
      httpClient.get('/api/protected').subscribe({ error: () => undefined });

      httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(mockSession.clearSession).toHaveBeenCalledTimes(1);
      expect(mockSessionNavigation.navigateToLogin).toHaveBeenCalledTimes(1);
    });

    it('should not loop when the replayed request is refused again', () => {
      mockSession.renewSession.mockReturnValue(of('fresh-token'));
      httpClient.get('/api/protected').subscribe({ error: () => undefined });

      httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });
      httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });

      // A revoked account answers 401 forever; without the retry marker every
      // request would spin through renewal indefinitely.
      expect(mockSession.renewSession).toHaveBeenCalledTimes(1);
      expect(mockSession.clearSession).toHaveBeenCalledTimes(1);
      expect(mockSessionNavigation.navigateToLogin).toHaveBeenCalledTimes(1);
      httpMock.verify();
    });

    it('should renew once for a burst of simultaneous failures', () => {
      mockSession.renewSession.mockReturnValue(of('fresh-token'));
      httpClient.get('/api/a').subscribe({ error: () => undefined });
      httpClient.get('/api/b').subscribe({ error: () => undefined });

      httpMock.expectOne('/api/a').flush(null, { status: 401, statusText: 'Unauthorized' });
      httpMock.expectOne('/api/b').flush(null, { status: 401, statusText: 'Unauthorized' });

      httpMock.expectOne('/api/a').flush({});
      httpMock.expectOne('/api/b').flush({});

      // Both go through the port, which shares one in-flight refresh: two calls
      // here, but the port must not fire two requests at a rotating token.
      expect(mockSession.renewSession).toHaveBeenCalledTimes(2);
      expect(mockSession.clearSession).not.toHaveBeenCalled();
    });
  });
});
