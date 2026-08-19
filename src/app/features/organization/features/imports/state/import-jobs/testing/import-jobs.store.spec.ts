import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ImportJobService } from '@features/organization/features/imports/data-access';
import type { ImportJobOutput } from '@features/organization/features/imports/models';
import { ImportJobsStore } from '../import-jobs.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ImportJobsStore', () => {
  let store: InstanceType<typeof ImportJobsStore>;
  let mockService: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    pollJob: ReturnType<typeof vi.fn>;
  };

  const organizationId = 'org-1';

  const job: ImportJobOutput = {
    '@id': '/api/imports/job-1',
    '@type': 'ImportJob',
    id: 'job-1',
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

  const collection: HydraCollection<ImportJobOutput> = {
    '@id': '/api/imports',
    '@type': 'Collection',
    totalItems: 1,
    member: [job],
  };

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockReturnValue(of(collection)),
      get: vi.fn().mockReturnValue(of(job)),
      create: vi.fn().mockReturnValue(of(job)),
      pollJob: vi.fn().mockReturnValue(of(job)),
    };

    TestBed.configureTestingModule({
      providers: [ImportJobsStore, { provide: ImportJobService, useValue: mockService }],
    });

    store = TestBed.inject(ImportJobsStore);
  });

  describe('load', () => {
    it('should populate the job collection on success', async () => {
      store.load({ organizationId });
      await flushEffects();

      expect(mockService.list).toHaveBeenCalledWith(organizationId, undefined, undefined);
      expect(store.jobs()).toEqual([job]);
      expect(store.totalJobs()).toBe(1);
      expect(store.isEmpty()).toBe(false);
      expect(store.hasListError()).toBe(false);
    });

    it('should record a normalized error on failure', async () => {
      mockService.list.mockReturnValue(throwError(() => ({ status: 500, title: 'Server error' })));

      store.load({ organizationId });
      await flushEffects();

      expect(store.hasListError()).toBe(true);
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('create', () => {
    it('should insert the created job and start polling it', async () => {
      const file = new File(['a,b'], 'equipment.csv', { type: 'text/csv' });

      store.create({ organizationId, kind: 'equipment', file, dryRun: false });
      await flushEffects();

      expect(mockService.create).toHaveBeenCalledWith(organizationId, 'equipment', file, false);
      expect(store.jobs()).toEqual([job]);
      expect(store.isCreating()).toBe(false);
      expect(mockService.pollJob).toHaveBeenCalledWith(job);
    });

    it('should record a normalized error and insert no job on failure', async () => {
      mockService.create.mockReturnValue(
        throwError(() => ({ status: 422, title: 'Unprocessable Entity' })),
      );
      const file = new File(['bad'], 'notes.txt');

      store.create({ organizationId, kind: 'equipment', file });
      await flushEffects();

      expect(store.jobs()).toEqual([]);
      expect(store.createError()).not.toBeNull();
    });
  });

  describe('poll', () => {
    it('should replace the row with every emission until the observable completes', async () => {
      const processing: ImportJobOutput = { ...job, status: 'processing', processedRows: 50 };
      const completed: ImportJobOutput = { ...job, status: 'completed', processedRows: 100 };
      const emissions = new Subject<ImportJobOutput>();
      mockService.pollJob.mockReturnValue(emissions.asObservable());

      store.create({ organizationId, kind: 'equipment', file: new File([''], 'e.csv') });
      await flushEffects();

      emissions.next(processing);
      await flushEffects();
      expect(store.jobs()).toEqual([processing]);

      emissions.next(completed);
      emissions.complete();
      await flushEffects();
      expect(store.jobs()).toEqual([completed]);
    });

    it('should leave the row untouched when the poll itself errors', async () => {
      mockService.pollJob.mockReturnValue(
        throwError(() => ({ status: 0, title: 'Network Error' })),
      );

      store.create({ organizationId, kind: 'equipment', file: new File([''], 'e.csv') });
      await flushEffects();

      expect(store.jobs()).toEqual([job]);
    });

    it('should poll two jobs independently rather than one cancelling the other', async () => {
      const other: ImportJobOutput = { ...job, id: 'job-2' };
      const firstPoll = new Subject<ImportJobOutput>();
      const secondPoll = new Subject<ImportJobOutput>();
      mockService.pollJob.mockReturnValueOnce(firstPoll.asObservable());
      mockService.create.mockReturnValueOnce(of(job));

      store.create({ organizationId, kind: 'equipment', file: new File([''], 'e.csv') });
      await flushEffects();

      mockService.pollJob.mockReturnValueOnce(secondPoll.asObservable());
      mockService.create.mockReturnValueOnce(of(other));
      store.create({ organizationId, kind: 'facility', file: new File([''], 'f.csv') });
      await flushEffects();

      secondPoll.next({ ...other, status: 'completed' });
      await flushEffects();

      expect(store.jobs().find((j) => j.id === 'job-2')?.status).toBe('completed');
      expect(store.jobs().find((j) => j.id === 'job-1')?.status).toBe('pending');
    });
  });

  describe('refresh', () => {
    it('should re-read one job and replace its cached row', async () => {
      store.load({ organizationId });
      await flushEffects();

      mockService.get.mockReturnValue(of({ ...job, status: 'failed' }));
      store.refresh('job-1');
      await flushEffects();

      expect(mockService.get).toHaveBeenCalledWith('job-1');
      expect(store.jobs()).toEqual([{ ...job, status: 'failed' }]);
    });
  });

  describe('resetCreateOperation', () => {
    it('should return the create operation to idle', async () => {
      mockService.create.mockReturnValue(
        throwError(() => ({ status: 500, title: 'Server error' })),
      );

      store.create({ organizationId, kind: 'equipment', file: new File([''], 'e.csv') });
      await flushEffects();

      store.resetCreateOperation();

      expect(store.isCreating()).toBe(false);
      expect(store.createError()).toBeNull();
    });
  });
});
