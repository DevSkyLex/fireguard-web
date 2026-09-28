import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  type EnvironmentProviders,
  PLATFORM_ID,
  type Provider,
  REQUEST,
  RESPONSE_INIT,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ssrCookieForwardInterceptor } from '../ssr-cookie-forward.interceptor';

describe('ssrCookieForwardInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  const configure = (
    platformId: 'browser' | 'server',
    request?: Request,
    responseInit?: ResponseInit,
  ): void => {
    const providers: Array<Provider | EnvironmentProviders> = [
      provideHttpClient(withInterceptors([ssrCookieForwardInterceptor])),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: platformId },
    ];

    if (request) {
      providers.push({ provide: REQUEST, useValue: request });
    }
    if (responseInit) {
      providers.push({ provide: RESPONSE_INIT, useValue: responseInit });
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

  it('forwards a rotated same-host refresh cookie to the SSR HTML response', () => {
    const responseInit: ResponseInit = { headers: new Headers() };
    configure(
      'server',
      new Request('http://localhost:4200/organizations', {
        headers: { cookie: 'refresh_token=old' },
      }),
      responseInit,
    );

    httpClient.post('http://localhost:8000/api/auth/refresh', {}).subscribe();

    const req = httpMock.expectOne('http://localhost:8000/api/auth/refresh');
    expect(req.request.headers.get('Cookie')).toBe('refresh_token=old');
    req.flush(
      { access_token: 'new-access-token' },
      { headers: { 'Set-Cookie': 'refresh_token=new; Path=/; HttpOnly; SameSite=Strict' } },
    );

    expect(new Headers(responseInit.headers).get('Set-Cookie')).toBe(
      'refresh_token=new; Path=/; HttpOnly; SameSite=Strict',
    );
    httpMock.verify();
  });

  it('forwards an API cookie clearing a refused SSR refresh', () => {
    const responseInit: ResponseInit = { headers: new Headers() };
    configure(
      'server',
      new Request('http://localhost:4200/organizations', {
        headers: { cookie: 'refresh_token=invalid' },
      }),
      responseInit,
    );

    httpClient
      .post('http://localhost:8000/api/auth/refresh', {})
      .subscribe({ error: (): void => undefined });

    httpMock.expectOne('http://localhost:8000/api/auth/refresh').flush(
      {},
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Set-Cookie': 'refresh_token=; Max-Age=0; Path=/; HttpOnly' },
      },
    );

    expect(new Headers(responseInit.headers).get('Set-Cookie')).toBe(
      'refresh_token=; Max-Age=0; Path=/; HttpOnly',
    );
    httpMock.verify();
  });

  it('does not set the web host cookie from another API hostname', () => {
    const responseInit: ResponseInit = { headers: new Headers() };
    configure(
      'server',
      new Request('https://app.fireguard.test/organizations', {
        headers: { cookie: 'refresh_token=old' },
      }),
      responseInit,
    );

    httpClient.post('https://api.fireguard.test/api/auth/refresh', {}).subscribe();
    httpMock
      .expectOne('https://api.fireguard.test/api/auth/refresh')
      .flush({}, { headers: { 'Set-Cookie': 'refresh_token=new; Path=/; HttpOnly' } });

    expect(new Headers(responseInit.headers).has('Set-Cookie')).toBe(false);
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
