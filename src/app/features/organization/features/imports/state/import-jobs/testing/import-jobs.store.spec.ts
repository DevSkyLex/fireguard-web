import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
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
  let dispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockService: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    template: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
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
    dispatcher = { dispatch: vi.fn() };
    mockService = {
      list: vi.fn().mockReturnValue(of(collection)),
      get: vi.fn().mockReturnValue(of(job)),
      create: vi.fn().mockReturnValue(of(job)),
      confirm: vi.fn(),
      template: vi.fn(),
      resume: vi.fn().mockReturnValue(of(job)),
      pollJob: vi.fn().mockReturnValue(of(job)),
    };

    TestBed.configureTestingModule({
      providers: [
        ImportJobsStore,
        { provide: ImportJobService, useValue: mockService },
        { provide: Dispatcher, useValue: dispatcher },
      ],
    });

    store = TestBed.inject(ImportJobsStore);
  });

  it('retries confirmation of the same simulation after a lost reply', () => {
    const source = { ...job, status: 'completed' as const, dryRun: true, canConfirm: true };
    mockService.list.mockReturnValue(of({ ...collection, member: [source] }));
    store.load({ organizationId });
    const pending = new Subject<ImportJobOutput>();
    mockService.confirm.mockReturnValue(pending);
    store.confirm(job.id);
    store.confirm(job.id);
    expect(mockService.confirm).toHaveBeenCalledTimes(1);
    pending.error({ status: 0 });
    expect(store.confirmCallStates()[job.id].status).toBe('error');
    expect(store.jobEntityMap()[job.id]).toEqual(source);
    const real = { ...job, id: 'real-job', status: 'completed' as const };
    mockService.confirm.mockReturnValue(of(real));
    mockService.list.mockReturnValue(
      of({ ...collection, member: [{ ...source, canConfirm: false, confirmedJobId: real.id }] }),
    );
    store.confirm(job.id);
    expect(mockService.confirm).toHaveBeenNthCalledWith(2, job.id);
    expect(store.jobEntityMap()[job.id].confirmedJobId).toBe(real.id);
    expect(store.jobEntityMap()[real.id]).toEqual(real);
    expect(store.confirmCallStates()[job.id].status).toBe('success');
  });

  it('cancels template and confirmation responses after organization change', () => {
    const source = { ...job, dryRun: true, status: 'completed' as const, canConfirm: true };
    mockService.list.mockReturnValue(of({ ...collection, member: [source] }));
    store.load({ organizationId });
    const confirmation = new Subject<ImportJobOutput>();
    const template = new Subject<never>();
    mockService.confirm.mockReturnValue(confirmation);
    mockService.template.mockReturnValue(template);
    store.confirm(job.id);
    store.downloadTemplate('equipment');
    mockService.list.mockReturnValue(of({ ...collection, member: [], totalItems: 0 }));
    store.load({ organizationId: 'other' });
    expect(confirmation.observed).toBe(false);
    expect(template.observed).toBe(false);
    confirmation.next({ ...job, id: 'late' });
    expect(store.jobEntityMap()['late']).toBeUndefined();
    expect(store.templateCallState().status).toBe('idle');
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

  it('resumes the same job once, preserving confirmed rows after a rejected request', async () => {
    const stalled = {
      ...job,
      status: 'failed' as const,
      processedRows: 7,
      successfulRows: 7,
      canResume: true,
    };
    mockService.list.mockReturnValue(of({ ...collection, member: [stalled] }));
    const reply = new Subject<ImportJobOutput>();
    mockService.resume.mockReturnValue(reply);
    store.load({ organizationId });
    store.resume(job.id);
    store.resume(job.id);
    expect(mockService.resume).toHaveBeenCalledExactlyOnceWith(job.id);
    expect(store.resumeCallStates()[job.id]?.status).toBe('pending');
    reply.error({ status: 409, message: 'Another worker owns the import.' });
    await flushEffects();
    expect(store.resumeCallStates()[job.id]?.status).toBe('error');
    expect(store.jobEntityMap()[job.id]).toEqual(stalled);
    expect(mockService.create).not.toHaveBeenCalled();
  });

  it('starts observation after acceptance and ignores a resume response after organization changes', async () => {
    const stalled = {
      ...job,
      status: 'failed' as const,
      processedRows: 7,
      successfulRows: 7,
      canResume: true,
    };
    mockService.list.mockReturnValue(of({ ...collection, member: [stalled] }));
    store.load({ organizationId });
    const resumed = { ...stalled, status: 'pending' as const, canResume: false };
    mockService.resume.mockReturnValue(of(resumed));
    mockService.pollJob.mockReturnValue(of(resumed));
    store.resume(job.id);
    expect(store.jobEntityMap()[job.id]?.processedRows).toBe(7);
    expect(mockService.pollJob).toHaveBeenCalledWith(resumed);
    store.load({ organizationId });
    const late = new Subject<ImportJobOutput>();
    mockService.resume.mockReturnValue(late);
    store.resume(job.id);
    mockService.list.mockReturnValue(of({ ...collection, member: [], totalItems: 0 }));
    store.load({ organizationId: 'org-2' });
    late.next(resumed);
    await flushEffects();
    expect(store.jobs()).toEqual([]);
    expect(store.resumeCallStates()).toEqual({});
  });

  describe('create', () => {
    it('should accept uploads in new organization generations without cancelling previous writes', () => {
      const firstVisit = new Subject<ImportJobOutput>();
      const secondOrganization = new Subject<ImportJobOutput>();
      const currentVisit = new Subject<ImportJobOutput>();
      const file = new File(['a,b'], 'equipment.csv');
      mockService.list.mockReturnValue(of({ ...collection, member: [], totalItems: 0 }));
      mockService.create
        .mockReturnValueOnce(firstVisit)
        .mockReturnValueOnce(secondOrganization)
        .mockReturnValueOnce(currentVisit);

      store.load({ organizationId });
      store.create({ organizationId, kind: 'equipment', file });
      store.load({ organizationId: 'org-2' });
      store.create({ organizationId: 'org-2', kind: 'equipment', file });

      expect(mockService.create).toHaveBeenCalledTimes(2);
      expect(firstVisit.observed).toBe(true);
      expect(store.isCreating()).toBe(true);

      store.load({ organizationId });
      store.create({ organizationId, kind: 'equipment', file });
      firstVisit.next({ ...job, id: 'departed-job', status: 'completed' });
      firstVisit.complete();
      secondOrganization.error(new Error('Departed failure'));
      store.create({ organizationId, kind: 'facility', file });

      expect(mockService.create).toHaveBeenCalledTimes(3);
      expect(store.isCreating()).toBe(true);
      expect(store.createError()).toBeNull();
      expect(store.jobEntities()).toEqual([]);
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
      expect(mockService.pollJob).not.toHaveBeenCalled();

      const accepted = { ...job, id: 'current-job', status: 'completed' as const };
      currentVisit.next(accepted);
      currentVisit.complete();
      expect(store.createCallState().status).toBe('success');
      expect(store.jobEntityMap()[accepted.id]).toEqual(accepted);
      expect(dispatcher.dispatch).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          type: '[Import Jobs Store] reportReady',
          payload: { organizationId, jobId: accepted.id },
        }),
      );
    });

    it('should not let form reset or a duplicate command unlock an accepted upload', () => {
      const response = new Subject<ImportJobOutput>();
      const file = new File(['a,b'], 'equipment.csv');
      mockService.create.mockReturnValue(response);
      store.create({ organizationId, kind: 'equipment', file });
      store.resetCreateOperation();
      store.create({ organizationId, kind: 'equipment', file });

      expect(mockService.create).toHaveBeenCalledTimes(1);
      expect(response.observed).toBe(true);
      expect(store.createCallState().status).toBe('pending');

      response.error(new Error('Retryable upload failure'));
      mockService.create.mockReturnValue(of(job));
      store.create({ organizationId, kind: 'equipment', file });
      expect(mockService.create).toHaveBeenCalledTimes(2);
      expect(store.createCallState().status).toBe('success');
    });

    it('should reject an upload for an inactive organization without marking it pending', () => {
      store.load({ organizationId });
      store.create({
        organizationId: 'departed',
        kind: 'equipment',
        file: new File([''], 'e.csv'),
      });

      expect(mockService.create).not.toHaveBeenCalled();
      expect(store.createCallState().status).toBe('idle');
    });

    it('should insert the created job and start polling it', async () => {
      const file = new File(['a,b'], 'equipment.csv', { type: 'text/csv' });

      store.create({ organizationId, kind: 'equipment', file, dryRun: false });
      await flushEffects();

      expect(mockService.create).toHaveBeenCalledWith(organizationId, 'equipment', file, false);
      expect(store.jobEntities()).toEqual([job]);
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

      expect(store.jobEntities()).toEqual([]);
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
      expect(store.jobEntities()).toEqual([processing]);

      emissions.next(completed);
      emissions.complete();
      await flushEffects();
      expect(store.jobEntities()).toEqual([completed]);
    });

    it('should leave the row untouched when the poll itself errors', async () => {
      mockService.pollJob.mockReturnValue(
        throwError(() => ({ status: 0, title: 'Network Error' })),
      );

      store.create({ organizationId, kind: 'equipment', file: new File([''], 'e.csv') });
      await flushEffects();

      expect(store.jobEntities()).toEqual([job]);
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

      expect(store.jobEntities().find((j) => j.id === 'job-2')?.status).toBe('completed');
      expect(store.jobEntities().find((j) => j.id === 'job-1')?.status).toBe('pending');
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
