import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from '@core/stores/auth';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockAuthStore: { accessToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthStore = {
      accessToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header for protected API endpoints', () => {
    mockAuthStore.accessToken.mockReturnValue('jwt-token');

    httpClient.get('/api/users/me').subscribe();

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({ ok: true });
  });

  it('should not add Authorization header when token is missing', () => {
    mockAuthStore.accessToken.mockReturnValue(null);

    httpClient.get('/api/users/me').subscribe();

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ ok: true });
  });

  it('should not add Authorization header for non API URLs', () => {
    mockAuthStore.accessToken.mockReturnValue('jwt-token');

    httpClient.get('/assets/config.json').subscribe();

    const req = httpMock.expectOne('/assets/config.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ ok: true });
  });

  it('should not override existing Authorization header', () => {
    mockAuthStore.accessToken.mockReturnValue('jwt-token');

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
    mockAuthStore.accessToken.mockReturnValue('jwt-token');

    httpClient.post('/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ ok: true });
  });
});
