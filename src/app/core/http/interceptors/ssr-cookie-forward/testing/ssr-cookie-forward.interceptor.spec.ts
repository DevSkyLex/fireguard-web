import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type EnvironmentProviders, PLATFORM_ID, type Provider, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ssrCookieForwardInterceptor } from '../ssr-cookie-forward.interceptor';

describe('ssrCookieForwardInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  const configure = (platformId: 'browser' | 'server', request?: Request): void => {
    const providers: Array<Provider | EnvironmentProviders> = [
      provideHttpClient(withInterceptors([ssrCookieForwardInterceptor])),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: platformId },
    ];

    if (request) {
      providers.push({ provide: REQUEST, useValue: request });
    }

    TestBed.configureTestingModule({ providers });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should forward incoming cookie header during SSR', () => {
    configure(
      'server',
      new Request('http://localhost', {
        headers: { cookie: 'refresh_token=abc123; theme=dark' },
      }),
    );

    httpClient.post('/api/auth/refresh', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.headers.get('Cookie')).toBe('refresh_token=abc123');
    req.flush({ ok: true });
    httpMock.verify();
  });

  it('should forward only whitelisted session-related cookies during SSR', () => {
    configure(
      'server',
      new Request('http://localhost', {
        headers: {
          cookie:
            'theme-preference=dark; __Host-refresh_token=secure123; analytics=enabled; trusted_device_token=device456',
        },
      }),
    );

    httpClient.post('/api/auth/refresh', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.headers.get('Cookie')).toBe(
      '__Host-refresh_token=secure123; trusted_device_token=device456',
    );
    req.flush({ ok: true });
    httpMock.verify();
  });

  it('should not override an explicit Cookie header', () => {
    configure(
      'server',
      new Request('http://localhost', {
        headers: { cookie: 'refresh_token=abc123' },
      }),
    );

    httpClient
      .post('/api/auth/refresh', {}, { headers: { Cookie: 'manual_cookie=1' } })
      .subscribe();

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.headers.get('Cookie')).toBe('manual_cookie=1');
    req.flush({ ok: true });
    httpMock.verify();
  });

  it('should skip forwarding in browser runtime', () => {
    configure(
      'browser',
      new Request('http://localhost', {
        headers: { cookie: 'refresh_token=abc123' },
      }),
    );

    httpClient.post('/api/auth/refresh', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.headers.has('Cookie')).toBe(false);
    req.flush({ ok: true });
    httpMock.verify();
  });

  it('should skip forwarding when SSR request context is missing', () => {
    configure('server');

    httpClient.post('/api/auth/refresh', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.headers.has('Cookie')).toBe(false);
    req.flush({ ok: true });
    httpMock.verify();
  });

  it('should skip forwarding when no whitelisted cookies are present', () => {
    configure(
      'server',
      new Request('http://localhost', {
        headers: { cookie: 'theme-preference=dark; analytics=enabled' },
      }),
    );

    httpClient.post('/api/auth/refresh', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.headers.has('Cookie')).toBe(false);
    req.flush({ ok: true });
    httpMock.verify();
  });
});
