import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { unauthorizedInterceptor } from '../unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockSession: { clearSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRouter = { navigate: vi.fn() };
    mockSession = { clearSession: vi.fn() };

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
});
