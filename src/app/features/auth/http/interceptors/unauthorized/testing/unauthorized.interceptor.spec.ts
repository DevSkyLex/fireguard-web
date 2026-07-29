import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { unauthorizedInterceptor } from '../unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockSession: {
    clearSession: ReturnType<typeof vi.fn>;
    renewSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRouter = { navigate: vi.fn() };
    mockSession = { clearSession: vi.fn(), renewSession: vi.fn(() => of(null)) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        {
          provide: AUTH_SESSION_PORT,
          useValue: {
            ...mockSession,
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

    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockSession.clearSession).not.toHaveBeenCalled();
  });

  it('should clear the session and redirect to login on a 401', () => {
    httpClient.get('/api/protected').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(mockSession.clearSession).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should NOT handle a 401 on an excluded auth endpoint', () => {
    httpClient.post('/api/auth/login', {}).subscribe({ error: () => undefined });

    httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(mockSession.clearSession).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['/api/auth/mfa/verify', 'a mistyped MFA code'],
    ['/api/auth/mfa/resend', 'a resend on an expired challenge'],
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
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should still sign the user out on a 401 from a look-alike path', () => {
    httpClient.get('/api/me/password-history').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/me/password-history')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(mockSession.clearSession).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  describe('silent renewal', () => {
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
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should sign the user out when the renewal itself fails', () => {
      mockSession.renewSession.mockReturnValue(of(null));
      httpClient.get('/api/protected').subscribe({ error: () => undefined });

      httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(mockSession.clearSession).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
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
