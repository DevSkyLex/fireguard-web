import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, Service } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Observable } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  ApiError,
  ApiRequestOptions,
  HydraCollection,
  HydraItem,
  RequestOptions,
} from '../../../models';
import { HydraApiService } from '../hydra-api.service';

/**
 * Class TestResourceService
 * @class TestResourceService
 * @extends {HydraApiService}
 *
 * @description
 * Minimal concrete subclass exposing {@link HydraApiService.getCollection}
 * so the abstract base's `buildParams` serialization can be exercised
 * through `HttpTestingController` without reaching into protected members.
 */
@Service()
class TestResourceService extends HydraApiService {
  public write(method: string, options?: ApiRequestOptions): Observable<unknown> {
    switch (method) {
      case 'post':
        return this.post<object, HydraItem>('/api/resources/one', {}, options);
      case 'postAction':
        return this.postAction<HydraItem>('/api/resources/one', options);
      case 'put':
        return this.put<object, HydraItem>('/api/resources/one', {}, options);
      case 'patch':
        return this.patch<object, HydraItem>('/api/resources/one', {}, options);
      case 'patchWithStatus':
        return this.patchWithStatus<object, HydraItem>('/api/resources/one', {}, options);
      case 'delete':
        return this.delete('/api/resources/one', options);
      default:
        return this.deleteOne<HydraItem>('/api/resources/one', options);
    }
  }

  public upload(body: FormData, options?: ApiRequestOptions): Observable<HydraItem> {
    return this.postMultipart<HydraItem>('/api/resources/upload', body, options);
  }

  public list(options?: RequestOptions): Observable<HydraCollection<HydraItem>> {
    return this.getCollection<HydraItem>('/api/resources', options);
  }

  public remove(): Observable<HydraItem> {
    return this.deleteOne<HydraItem>('/api/resources/one');
  }
}

describe('HydraApiService', () => {
  let service: HydraApiService;
  let resourceService: TestResourceService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/resources`;
  const mockCollection: HydraCollection<HydraItem> = {
    '@id': '/api/resources',
    '@type': 'Collection',
    member: [],
    totalItems: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HydraApiService,
        TestResourceService,
        { provide: ENV_CONFIG, useValue: mockEnv },
        { provide: LOCALE_ID, useValue: 'fr-CA' },
      ],
    });
    service = TestBed.inject(HydraApiService);
    resourceService = TestBed.inject(TestResourceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it.each(['post', 'postAction', 'put', 'patch', 'patchWithStatus', 'delete', 'deleteOne'])(
    'allocates %s identity before construction and retains it across cold subscriptions',
    (method) => {
      const write = resourceService.write(method);
      httpMock.expectNone(`${baseUrl}/one`);
      write.subscribe();
      const first = httpMock.expectOne(`${baseUrl}/one`);
      const key = first.request.headers.get('Idempotency-Key');
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      first.flush({ '@id': '/api/resources/one', '@type': 'Resource' });
      write.subscribe();
      const replay = httpMock.expectOne(`${baseUrl}/one`);
      expect(replay.request.headers.get('Idempotency-Key')).toBe(key);
      replay.flush({ '@id': '/api/resources/one', '@type': 'Resource' });
      resourceService.write(method).subscribe();
      const nextIntention = httpMock.expectOne(`${baseUrl}/one`);
      expect(nextIntention.request.headers.get('Idempotency-Key')).not.toBe(key);
      nextIntention.flush({ '@id': '/api/resources/one', '@type': 'Resource' });
    },
  );

  it('preserves an explicit retry identity and leaves multipart boundaries to the browser', () => {
    const body = new FormData();
    body.set('file', new Blob(['evidence']), 'evidence.txt');
    const key = crypto.randomUUID();
    const upload = resourceService.upload(body, {
      idempotencyKey: key,
      headers: { 'Content-Type': 'incorrect-boundary' },
    });
    upload.subscribe();
    const request = httpMock.expectOne(`${baseUrl}/upload`);
    expect(request.request.headers.get('Idempotency-Key')).toBe(key);
    expect(request.request.headers.has('Content-Type')).toBe(false);
    expect(request.request.body).toBe(body);
    request.flush({ '@id': '/api/resources/upload', '@type': 'Resource' });
    upload.subscribe();
    const retried = httpMock.expectOne(`${baseUrl}/upload`);
    expect(retried.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retried.request.body).toBe(body);
    retried.flush({ '@id': '/api/resources/upload', '@type': 'Resource' });
  });

  it('sends the interface language and allows a request to override it', () => {
    resourceService.list().subscribe();
    const defaultRequest = httpMock.expectOne(baseUrl);
    expect(defaultRequest.request.headers.get('Accept-Language')).toBe('fr');
    defaultRequest.flush(mockCollection);

    resourceService.list({ headers: { 'Accept-Language': 'es' } }).subscribe();
    const overriddenRequest = httpMock.expectOne(baseUrl);
    expect(overriddenRequest.request.headers.get('Accept-Language')).toBe('es');
    overriddenRequest.flush(mockCollection);
  });

  it('preserves a problem detail when the response omits optional error metadata', () => {
    const failed = vi.fn();
    resourceService.list({}).subscribe({ error: failed });
    httpMock
      .expectOne((r) => r.url === baseUrl)
      .flush({ detail: 'The intervention changed.' }, { status: 409, statusText: 'Conflict' });
    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 409,
        title: 'Request failed',
        detail: 'The intervention changed.',
      }),
    );
  });

  it('uses an actionable connection message instead of an HTTP URL for a network failure', () => {
    const failed = vi.fn();
    resourceService.list({}).subscribe({ error: failed });
    httpMock.expectOne((r) => r.url === baseUrl).error(new ProgressEvent('error'));
    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 0,
        title: 'Network error',
        detail: 'The connection is unavailable. Check your network and try again.',
      }),
    );
  });

  it('uses a response title instead of the HTTP/2 status text for an unstructured error', () => {
    const failed = vi.fn();
    resourceService.list().subscribe({ error: failed });
    httpMock
      .expectOne(baseUrl)
      .flush({ title: 'Capacity exceeded' }, { status: 429, statusText: 'OK' });
    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({ status: 429, title: 'Capacity exceeded' }),
    );
  });

  it('preserves plain Problem Details codes and field violations', () => {
    const problem = {
      type: '/validation_errors/invalid-input',
      status: 422,
      title: 'Validation failed',
      detail: 'name: This value should not be blank.',
      code: 'validation_failed',
      violations: [{ propertyPath: 'name', message: 'This value should not be blank.' }],
    };
    const failed = vi.fn();
    resourceService.list().subscribe({ error: failed });

    httpMock.expectOne(baseUrl).flush(problem, {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: { 'Content-Type': 'application/problem+json' },
    });

    expect(failed).toHaveBeenCalledWith(problem);
  });

  it('preserves API Platform 5 JSON-LD validation contexts and violations', () => {
    const problem = {
      '@context': '/api/contexts/ConstraintViolation',
      '@type': 'ConstraintViolation',
      type: '/validation_errors/invalid-input',
      status: 422,
      detail: 'name: This value should not be blank.',
      violations: [{ propertyPath: 'name', message: 'This value should not be blank.' }],
    };
    const failed = vi.fn();
    resourceService.list().subscribe({ error: failed });

    httpMock.expectOne(baseUrl).flush(problem, { status: 422, statusText: 'Unprocessable Entity' });

    expect(failed).toHaveBeenCalledWith(problem);
  });

  it.each([
    { value: true, expected: true },
    { value: false, expected: false },
    { value: 'true', expected: undefined },
    { value: 1, expected: undefined },
    { value: null, expected: undefined },
    { value: undefined, expected: undefined },
  ])('preserves only boolean completion confirmations: $value', ({ value, expected }) => {
    for (const structured of [false, true]) {
      const failed = vi.fn<(problem: ApiError) => void>();
      resourceService.list().subscribe({ error: failed });
      httpMock.expectOne(baseUrl).flush(
        {
          ...(structured ? { type: '/errors/idempotency_replay_expired', status: 409 } : {}),
          detail: 'The original replay result expired.',
          code: 'idempotency_replay_expired',
          operationCompleted: value,
        },
        { status: 409, statusText: 'Conflict' },
      );

      expect(failed).toHaveBeenCalledOnce();
      expect(failed).toHaveBeenCalledWith(
        expect.objectContaining({ status: 409, code: 'idempotency_replay_expired' }),
      );
      expect(failed.mock.calls[0]?.[0]?.operationCompleted).toBe(expected);
    }
  });

  it('uses the HTTP status when a completion confirmation body has another status', () => {
    const failed = vi.fn<(problem: ApiError) => void>();
    resourceService.list().subscribe({ error: failed });
    httpMock.expectOne(baseUrl).flush(
      {
        type: '/errors/idempotency_replay_expired',
        status: 409,
        detail: 'Current access is denied.',
        code: 'idempotency_replay_expired',
        operationCompleted: true,
      },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, operationCompleted: true }),
    );
  });

  it('should return a Hydra resource from a response-bearing delete', () => {
    const output: HydraItem = { '@id': '/api/resources', '@type': 'ResourceState' };
    const received = vi.fn();

    resourceService.remove().subscribe(received);

    const request = httpMock.expectOne(`${baseUrl}/one`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.withCredentials).toBe(true);
    request.flush(output);
    expect(received).toHaveBeenCalledWith(output);
  });

  describe('sort and search params', () => {
    it('should emit the bracketed order[field] pair for a sort option', () => {
      resourceService.list({ sort: { field: 'createdAt', direction: 'desc' } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('order[createdAt]')).toBe('desc');
      req.flush(mockCollection);
    });

    it('should emit the search term as-is', () => {
      resourceService.list({ search: 'north wing' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('search')).toBe('north wing');
      req.flush(mockCollection);
    });

    it('should skip an empty or whitespace-only search term', () => {
      resourceService.list({ search: '   ' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.has('search')).toBe(false);
      req.flush(mockCollection);
    });

    it('should combine sort, search, page and itemsPerPage with a passthrough param', () => {
      resourceService
        .list({
          page: 2,
          itemsPerPage: 25,
          sort: { field: 'name', direction: 'asc' },
          search: 'nord',
          params: { type: 'building' },
        })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('itemsPerPage')).toBe('25');
      expect(req.request.params.get('order[name]')).toBe('asc');
      expect(req.request.params.get('search')).toBe('nord');
      expect(req.request.params.get('type')).toBe('building');
      req.flush(mockCollection);
    });

    it('should leave a hand-built params passthrough unaffected when no sort or search is set', () => {
      resourceService
        .list({ params: { 'order[legacy]': 'asc', search: 'legacy-term' } })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('order[legacy]')).toBe('asc');
      expect(req.request.params.get('search')).toBe('legacy-term');
      req.flush(mockCollection);
    });

    it('should append a readonly array param as repeated key[]= values, the isAnyOf wire shape', () => {
      resourceService.list({ params: { status: ['draft', 'planned'] } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.has('status')).toBe(false);
      expect(req.request.params.getAll('status[]')).toEqual(['draft', 'planned']);
      req.flush(mockCollection);
    });

    it('should send the plain key= form for a scalar param, unaffected by array support', () => {
      resourceService.list({ params: { status: 'draft' } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.get('status')).toBe('draft');
      expect(req.request.params.has('status[]')).toBe(false);
      req.flush(mockCollection);
    });

    it('should drop an empty array param entirely rather than send an empty isAnyOf', () => {
      resourceService.list({ params: { status: [] } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === baseUrl);
      expect(req.request.params.has('status')).toBe(false);
      expect(req.request.params.has('status[]')).toBe(false);
      req.flush(mockCollection);
    });
  });
});
