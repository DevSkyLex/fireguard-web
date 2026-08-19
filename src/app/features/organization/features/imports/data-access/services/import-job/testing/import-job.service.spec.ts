import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { HydraCollection } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { ImportJobOutput } from '@features/organization/features/imports/models';
import { ImportJobService } from '../import-job.service';

describe('ImportJobService', () => {
  let service: ImportJobService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const organizationId = 'org-uuid-1';
  const jobId = 'job-uuid-1';
  const importsUrl = `${mockEnv.apiUrl}/api/imports`;

  const job: ImportJobOutput = {
    '@id': `/api/imports/${jobId}`,
    '@type': 'ImportJob',
    id: jobId,
    organization: `/api/organizations/${organizationId}`,
    kind: 'equipment',
    status: 'pending',
    originalFilename: 'equipment.csv',
    dryRun: false,
    processedRows: 0,
    successfulRows: 0,
    failedRows: 0,
    errorReport: [],
    createdAt: '2026-01-18T00:00:00+00:00',
    updatedAt: '2026-01-18T00:00:00+00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ImportJobService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(ImportJobService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('create', () => {
    it('should POST the organization IRI, kind and file as multipart parts', () => {
      const file = new File(['a,b\n1,2'], 'equipment.csv', { type: 'text/csv' });

      service.create(organizationId, 'equipment', file).subscribe();

      const request = httpMock.expectOne(importsUrl);
      expect(request.request.method).toBe('POST');
      const body = request.request.body as FormData;
      expect(body.get('organization')).toBe(`/api/organizations/${organizationId}`);
      expect(body.get('kind')).toBe('equipment');
      expect(body.get('file')).toBeInstanceOf(File);
      expect(body.has('dryRun')).toBe(false);
      request.flush(job);
    });

    it('should include dryRun only when explicitly true', () => {
      const file = new File(['a,b\n1,2'], 'facilities.csv', { type: 'text/csv' });

      service.create(organizationId, 'facility', file, true).subscribe();

      const request = httpMock.expectOne(importsUrl);
      const body = request.request.body as FormData;
      expect(body.get('kind')).toBe('facility');
      expect(body.get('dryRun')).toBe('true');
      request.flush({ ...job, kind: 'facility', dryRun: true });
    });

    it('should not send a dryRun part when explicitly false', () => {
      const file = new File(['a,b\n1,2'], 'equipment.csv', { type: 'text/csv' });

      service.create(organizationId, 'equipment', file, false).subscribe();

      const request = httpMock.expectOne(importsUrl);
      expect((request.request.body as FormData).has('dryRun')).toBe(false);
      request.flush(job);
    });

    it('should propagate a 422 invalid-file error untouched', () => {
      const file = new File(['not a csv'], 'notes.txt');
      let captured: unknown;

      service
        .create(organizationId, 'equipment', file)
        .subscribe({ error: (error: unknown) => (captured = error) });

      const request = httpMock.expectOne(importsUrl);
      request.flush(
        { status: 422, title: 'Unprocessable Entity' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(captured).toBeTruthy();
    });
  });

  describe('list', () => {
    it('should GET the canonical collection with the organization as a required param', () => {
      const collection: HydraCollection<ImportJobOutput> = {
        '@id': importsUrl,
        '@type': 'Collection',
        totalItems: 1,
        member: [job],
      };

      service.list(organizationId).subscribe((response) => {
        expect(response.member).toEqual([job]);
      });

      const request = httpMock.expectOne((r) => r.url === importsUrl);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('organization')).toBe(organizationId);
      expect(request.request.params.has('kind')).toBe(false);
      request.flush(collection);
    });

    it('should send the kind filter when provided', () => {
      service.list(organizationId, undefined, { kind: 'facility' }).subscribe();

      const request = httpMock.expectOne((r) => r.url === importsUrl);
      expect(request.request.params.get('kind')).toBe('facility');
      request.flush({ '@id': importsUrl, '@type': 'Collection', totalItems: 0, member: [] });
    });
  });

  describe('get', () => {
    it('should GET a single job', () => {
      service.get(jobId).subscribe((response) => {
        expect(response).toEqual(job);
      });

      const request = httpMock.expectOne(`${importsUrl}/${jobId}`);
      expect(request.request.method).toBe('GET');
      request.flush(job);
    });
  });

  describe('pollJob', () => {
    it('should re-read a running job once per interval and stop once terminal', () => {
      vi.useFakeTimers();
      const processing: ImportJobOutput = { ...job, status: 'processing', processedRows: 50 };
      const completed: ImportJobOutput = { ...job, status: 'completed', processedRows: 100 };
      let result: ImportJobOutput | undefined;

      service.pollJob(processing).subscribe((polled) => {
        result = polled;
      });

      vi.advanceTimersByTime(2_500);
      const request = httpMock.expectOne(`${importsUrl}/${jobId}`);
      request.flush(completed);

      expect(result).toEqual(completed);
      httpMock.verify();
      vi.useRealTimers();
    });

    it('should emit immediately without polling when the seed is already terminal', () => {
      let result: ImportJobOutput | undefined;

      service.pollJob({ ...job, status: 'completed' }).subscribe((polled) => {
        result = polled;
      });

      expect(result?.status).toBe('completed');
      httpMock.verify();
    });
  });
});
