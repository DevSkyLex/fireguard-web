import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
});
