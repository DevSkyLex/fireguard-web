import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Service, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraItem } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment';
import { idempotencyInterceptor } from '@core/http/interceptors/idempotency';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { AuthSessionNavigationService } from '@features/auth/services';
import { authInterceptor } from '../../auth/auth.interceptor';
import { unauthorizedInterceptor } from '../unauthorized.interceptor';

@Service()
class WriteRetryService extends HydraApiService {
  public save() {
    return this.post<object, HydraItem>('/api/resources', {});
  }
}

describe('unauthorizedInterceptor', () => {
  const revision = signal(1);
  let renewal: ReturnType<typeof vi.fn>;
  let requests: HttpTestingController;
  let writes: WriteRetryService;

  beforeEach(() => {
    revision.set(1);
    renewal = vi.fn(() => of('fresh-token'));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([idempotencyInterceptor, authInterceptor, unauthorizedInterceptor]),
        ),
        provideHttpClientTesting(),
        WriteRetryService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.example.test' } },
        {
          provide: AUTH_SESSION_PORT,
          useValue: {
            sessionRevision: revision,
            accessToken: signal('expired-token'),
            isAuthenticated: signal(true),
            initialized: signal(true),
            renewSession: renewal,
            clearSession: vi.fn(),
          },
        },
        { provide: AuthSessionNavigationService, useValue: { navigateToLogin: vi.fn() } },
      ],
    });
    requests = TestBed.inject(HttpTestingController);
    writes = TestBed.inject(WriteRetryService);
  });
  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
  });

  it('keeps the original write identity when a 401 refresh clones the request', () => {
    writes.save().subscribe();
    const first = requests.expectOne('https://api.example.test/api/resources');
    const key = first.request.headers.get('Idempotency-Key');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    const retried = requests.expectOne('https://api.example.test/api/resources');
    expect(retried.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush({ '@id': '/api/resources', '@type': 'Resource' });
  });

  it('does not replay an old write after the session owner changes during renewal', () => {
    const refreshed = new Subject<string | null>();
    renewal.mockReturnValue(refreshed);
    const failed = vi.fn();
    writes.save().subscribe({ error: failed });
    requests
      .expectOne('https://api.example.test/api/resources')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    revision.set(2);
    refreshed.next('replacement-token');
    requests.expectNone('https://api.example.test/api/resources');
    expect(failed).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });
});
