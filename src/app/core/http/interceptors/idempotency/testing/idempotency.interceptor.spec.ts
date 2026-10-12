import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment';
import { idempotencyInterceptor } from '../idempotency.interceptor';

describe('idempotencyInterceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([idempotencyInterceptor])),
        provideHttpClientTesting(),
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.example.test' } },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
  });

  it('fails trusted writes without an allocated identity before network I/O', () => {
    const failed = vi.fn();
    http.post('https://api.example.test/api/resources', {}).subscribe({ error: failed });
    requests.expectNone('https://api.example.test/api/resources');
    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        error: expect.objectContaining({ code: 'idempotency_key_required' }),
      }),
    );
  });

  it('retains a provided identity unchanged', () => {
    const key = crypto.randomUUID();
    http
      .post('https://api.example.test/api/resources', {}, { headers: { 'Idempotency-Key': key } })
      .subscribe();
    const request = requests.expectOne('https://api.example.test/api/resources');
    expect(request.request.headers.get('Idempotency-Key')).toBe(key);
    request.flush({});
  });

  it('requires an identity only for the explicit onboarding synchronization GET', () => {
    const failed = vi.fn();
    const synchronization = 'https://api.example.test/api/onboarding/organization';
    http.get(synchronization).subscribe({ error: failed });
    requests.expectNone(synchronization);
    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'idempotency_key_required' }),
      }),
    );

    const read = 'https://api.example.test/api/resources';
    http.get(read).subscribe();
    const request = requests.expectOne(read);
    expect(request.request.headers.has('Idempotency-Key')).toBe(false);
    request.flush({});
  });

  it.each([
    'https://outside.example.test/api/resources',
    'https://api.example.test.outside.test/api/resources',
    'https://api.example.test/third-party',
  ])('leaves unrelated URL %s without an identity header', (url) => {
    http.post(url, {}).subscribe();
    const request = requests.expectOne(url);
    expect(request.request.headers.has('Idempotency-Key')).toBe(false);
    request.flush({});
  });
});
