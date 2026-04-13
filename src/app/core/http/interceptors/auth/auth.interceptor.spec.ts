import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AUTH_SESSION } from '@features/auth/ports';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockAuthSession: { accessToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthSession = {
      accessToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_SESSION, useValue: mockAuthSession },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header for protected API endpoints', () => {
    mockAuthSession.accessToken.mockReturnValue('jwt-token');

    httpClient.get('/api/users/me').subscribe();

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({ ok: true });
  });

  it('should not add Authorization header when token is missing', () => {
    mockAuthSession.accessToken.mockReturnValue(null);

    httpClient.get('/api/users/me').subscribe();

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ ok: true });
  });

  it('should not add Authorization header for non API URLs', () => {
    mockAuthSession.accessToken.mockReturnValue('jwt-token');

    httpClient.get('/assets/config.json').subscribe();

    const req = httpMock.expectOne('/assets/config.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ ok: true });
  });

  it('should not override existing Authorization header', () => {
    mockAuthSession.accessToken.mockReturnValue('jwt-token');

    httpClient
      .get('/api/users/me', {
        headers: { Authorization: 'Basic abc123' },
      })
      .subscribe();

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Basic abc123');
    req.flush({ ok: true });
  });

  it('should skip public endpoints', () => {
    mockAuthSession.accessToken.mockReturnValue('jwt-token');

    httpClient.post('/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ ok: true });
  });
});
