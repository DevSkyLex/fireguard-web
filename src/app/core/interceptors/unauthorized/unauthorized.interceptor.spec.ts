import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { unauthorizedInterceptor } from './unauthorized.interceptor';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';

describe('unauthorizedInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockAuthStore: { clearToken: ReturnType<typeof vi.fn> };
  let mockUserStore: { clear: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRouter = { navigate: vi.fn() };
    mockAuthStore = { clearToken: vi.fn() };
    mockUserStore = { clear: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UserStore, useValue: mockUserStore },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should clear auth state and redirect on 401 for API requests', () => {
    httpClient.get('/api/users/me').subscribe({
      error: () => {
        expect(mockAuthStore.clearToken).toHaveBeenCalled();
        expect(mockUserStore.clear).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
      },
    });

    const req = httpMock.expectOne('/api/users/me');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('should not intercept 401 on /api/auth/login', () => {
    httpClient.post('/api/auth/login', {}).subscribe({
      error: () => {
        expect(mockAuthStore.clearToken).not.toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('should not intercept 401 on /api/auth/refresh', () => {
    httpClient.post('/api/auth/refresh', {}).subscribe({
      error: () => {
        expect(mockAuthStore.clearToken).not.toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne('/api/auth/refresh');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('should not intercept 401 on /api/auth/logout', () => {
    httpClient.post('/api/auth/logout', {}).subscribe({
      error: () => {
        expect(mockAuthStore.clearToken).not.toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne('/api/auth/logout');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('should not intercept non-401 errors', () => {
    httpClient.get('/api/users/me').subscribe({
      error: () => {
        expect(mockAuthStore.clearToken).not.toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne('/api/users/me');
    req.flush(null, { status: 500, statusText: 'Internal Server Error' });
  });

  it('should pass through successful responses', () => {
    httpClient.get('/api/users/me').subscribe((response) => {
      expect(response).toEqual({ id: 1 });
      expect(mockAuthStore.clearToken).not.toHaveBeenCalled();
    });

    const req = httpMock.expectOne('/api/users/me');
    req.flush({ id: 1 });
  });
});
