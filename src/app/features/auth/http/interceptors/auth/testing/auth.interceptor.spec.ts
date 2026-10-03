import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { authInterceptor } from '../auth.interceptor';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.fireguard.test' } },
        {
          provide: AUTH_SESSION_PORT,
          useValue: {
            accessToken: signal<string | null>('stale-access-token'),
            isAuthenticated: signal<boolean>(true),
            initialized: signal<boolean>(true),
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

  it.each([
    '/api/auth/federated/providers',
    '/api/auth/federated/google/start',
    '/api/auth/federated/google/complete',
    '/api/auth/federated/microsoft/start',
    '/api/auth/federated/microsoft/complete',
  ])('should omit a stale bearer token from the public endpoint %s', (url: string) => {
    httpClient.post(url, {}).subscribe();

    const request = httpMock.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('should keep the bearer token on an authenticated provider-link endpoint', () => {
    const url = '/api/auth/federated/connections/google/start';
    httpClient.post(url, {}).subscribe();

    const request = httpMock.expectOne(url);
    expect(request.request.headers.get('Authorization')).toBe('Bearer stale-access-token');
    request.flush({});
  });

  it.each([
    'https://outside.test/api/equipment',
    '//outside.test/api/equipment',
    'https://api.fireguard.test.outside.test/api/equipment',
    'http://api.fireguard.test/api/equipment',
    'https://api.fireguard.test:8443/api/equipment',
    'https://user:password@api.fireguard.test/api/equipment',
    'https://api.fireguard.test/asset?path=/api/equipment',
  ])('does not attach the session bearer to untrusted URL %s', (url) => {
    httpClient.get(url).subscribe();
    const request = httpMock.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('attaches the bearer only to the configured absolute API origin', () => {
    const url = 'https://api.fireguard.test/api/equipment';
    httpClient.get(url).subscribe();
    const request = httpMock.expectOne(url);
    expect(request.request.headers.get('Authorization')).toBe('Bearer stale-access-token');
    request.flush({});
  });

  it('recognizes a public endpoint when its URL contains query parameters', () => {
    const url = 'https://api.fireguard.test/api/auth/login?locale=fr';
    httpClient.post(url, {}).subscribe();
    const request = httpMock.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
