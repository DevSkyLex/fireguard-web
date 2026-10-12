import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { retry } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment';
import { idempotencyInterceptor } from '@core/http/interceptors/idempotency';
import { OnboardingService } from '../onboarding.service';

describe('OnboardingService synchronization identity', () => {
  let service: OnboardingService;
  let requests: HttpTestingController;
  const endpoint = 'https://api.example.test/api/onboarding/organization';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([idempotencyInterceptor])),
        provideHttpClientTesting(),
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.example.test' } },
      ],
    });
    service = TestBed.inject(OnboardingService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
  });

  it('allocates before subscription and retains the key for one logical synchronization', () => {
    const synchronize = service.get();
    requests.expectNone(endpoint);
    synchronize.subscribe();
    const first = requests.expectOne(endpoint);
    const key = first.request.headers.get('Idempotency-Key');
    expect(first.request.method).toBe('GET');
    expect(key).toMatch(/^[0-9a-f-]{36}$/i);
    first.flush({});

    synchronize.subscribe();
    const sameOperation = requests.expectOne(endpoint);
    expect(sameOperation.request.headers.get('Idempotency-Key')).toBe(key);
    sameOperation.flush({});

    service.get().subscribe();
    const anotherOperation = requests.expectOne(endpoint);
    expect(anotherOperation.request.headers.get('Idempotency-Key')).not.toBe(key);
    anotherOperation.flush({});
  });

  it('preserves an explicit identity through a transport retry', () => {
    const key = crypto.randomUUID();
    service.get({ idempotencyKey: key }).pipe(retry(1)).subscribe();
    requests.expectOne(endpoint).flush({}, { status: 503, statusText: 'Unavailable' });
    const retryRequest = requests.expectOne(endpoint);
    expect(retryRequest.request.headers.get('Idempotency-Key')).toBe(key);
    retryRequest.flush({});
  });
});
