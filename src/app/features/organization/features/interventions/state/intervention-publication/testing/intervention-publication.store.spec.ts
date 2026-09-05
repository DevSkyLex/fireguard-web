import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { lastValueFrom, Subject } from 'rxjs';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';
import {
  InterventionPublicationService,
  PublicationPollTimeoutError,
} from '@features/organization/features/interventions/services/intervention-publication';
import { InterventionPublicationStore } from '../intervention-publication.store';

const intervention = { id: 'i1', organization: '/api/organizations/o1' } as InterventionOutput;
const accepted = { id: 'p1', status: 'pending' } as PublicationOutput;
const completed = { ...accepted, status: 'completed' } as PublicationOutput;
const flush = (): Promise<void> =>
  Array.from({ length: 16 }).reduce<Promise<void>>(
    (pending) => pending.then(() => undefined),
    Promise.resolve(),
  );

describe('InterventionPublicationStore', () => {
  let store: InstanceType<typeof InterventionPublicationStore>;
  let api: {
    start: ReturnType<typeof vi.fn>;
    observe: ReturnType<typeof vi.fn>;
    checkStatus: ReturnType<typeof vi.fn>;
  };
  let offline: {
    publicationOwner: ReturnType<typeof vi.fn>;
    loadPublicationTracking: ReturnType<typeof vi.fn>;
    savePublicationTracking: ReturnType<typeof vi.fn>;
  };
  let dispatch: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    api = {
      start: vi.fn().mockResolvedValue(accepted),
      observe: vi.fn().mockResolvedValue(completed),
      checkStatus: vi.fn().mockResolvedValue(completed),
    };
    offline = {
      publicationOwner: vi.fn().mockReturnValue('account-1'),
      loadPublicationTracking: vi.fn().mockResolvedValue(null),
      savePublicationTracking: vi.fn().mockResolvedValue(undefined),
    };
    dispatch = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        InterventionPublicationStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InterventionPublicationService, useValue: api },
        { provide: InterventionOfflineService, useValue: offline },
      ],
    });
    store = TestBed.inject(InterventionPublicationStore);
  });
  afterEach(() => vi.useRealTimers());

  it('records the identifier before observation and emits only confirmed completion', async () => {
    const result = new Subject<PublicationOutput>();
    api.observe.mockReturnValue(lastValueFrom(result));
    store.publish(intervention);
    await flush();
    expect(store.publicationId()).toBe('p1');
    expect(store.publishing()).toBe(true);
    expect(offline.savePublicationTracking).toHaveBeenCalledWith(
      intervention.organization,
      'i1',
      expect.objectContaining({ publicationId: 'p1', status: 'pending' }),
    );
    expect(dispatch).not.toHaveBeenCalled();
    result.next(completed);
    result.complete();
    await flush();
    expect(store.publishCallState().data).toEqual(completed);
    expect(store.unresolved()).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('does not start a second publication while the first request is in flight', async () => {
    api.start.mockReturnValue(new Promise(() => {}));
    store.publish(intervention);
    store.publish(intervention);
    await flush();
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it('preserves the identifier and forbids reposting after observation loses the network', async () => {
    api.observe.mockRejectedValue(new Error('network'));
    store.publish(intervention);
    await flush();
    store.reset();
    store.publish(intervention);
    await flush();
    expect(store.publicationId()).toBe('p1');
    expect(store.unresolved()).toBe(true);
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
    store.recheck();
    await flush();
    expect(api.checkStatus).toHaveBeenCalledWith('p1');
    expect(store.unresolved()).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('keeps a poll timeout distinct from a terminal failure', async () => {
    api.observe.mockRejectedValue(new PublicationPollTimeoutError('p1'));
    store.publish(intervention);
    await flush();
    expect(store.timedOut()).toBe(true);
    expect(store.tracking()?.status).toBe('pending');
    expect(store.error()).toContain('not confirmed');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('keeps a lost launch response unknown and never retries it automatically', async () => {
    api.start.mockRejectedValue(new Error('connection lost'));
    store.publish(intervention);
    await flush();
    store.reset();
    store.recheck();
    store.publish(intervention);
    await flush();
    expect(store.tracking()?.status).toBe('unknown');
    expect(store.publicationId()).toBeNull();
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(api.checkStatus).not.toHaveBeenCalled();
  });

  it('surfaces a confirmed failure and permits a deliberate new attempt', async () => {
    api.observe.mockResolvedValue({ ...accepted, status: 'failed', error: 'Rejected revision' });
    store.publish(intervention);
    await flush();
    expect(store.error()).toBe('Rejected revision');
    expect(store.unresolved()).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    store.reset();
    api.observe.mockResolvedValue(completed);
    store.publish(intervention);
    await flush();
    expect(api.start).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('restores the same accepted operation after revisiting a page', async () => {
    offline.loadPublicationTracking.mockResolvedValue({
      publicationId: 'p1',
      status: 'processing',
      checkedAt: 1,
    });
    store.restore({ organization: intervention.organization, interventionId: 'i1' });
    await flush();
    expect(store.publicationId()).toBe('p1');
    store.recheck();
    await flush();
    expect(api.start).not.toHaveBeenCalled();
    expect(api.checkStatus).toHaveBeenCalledWith('p1');
  });

  it('ignores a late recovery read after changing interventions', async () => {
    const pending = new Subject<null>();
    offline.loadPublicationTracking.mockReturnValueOnce(lastValueFrom(pending));
    store.restore({ organization: intervention.organization, interventionId: 'old' });
    offline.loadPublicationTracking.mockResolvedValue({
      publicationId: 'new-pub',
      status: 'pending',
      checkedAt: 1,
    });
    store.restore({ organization: intervention.organization, interventionId: 'new' });
    await flush();
    pending.next(null);
    pending.complete();
    await flush();
    expect(store.publicationId()).toBe('new-pub');
  });

  it('does not treat an in-progress recheck as a failure or success of publication', async () => {
    api.observe.mockRejectedValue(new PublicationPollTimeoutError('p1'));
    store.publish(intervention);
    await flush();
    api.checkStatus.mockResolvedValue({ ...accepted, status: 'processing' });
    store.recheck();
    await flush();
    expect(store.error()).toBeNull();
    expect(store.unresolved()).toBe(true);
    expect(store.tracking()?.status).toBe('processing');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('keeps recovery metadata on a rejected recheck', async () => {
    api.observe.mockRejectedValue(new PublicationPollTimeoutError('p1'));
    store.publish(intervention);
    await flush();
    api.checkStatus.mockRejectedValue(new Error('network'));
    store.recheck();
    await flush();
    expect(store.publicationId()).toBe('p1');
    expect(store.unresolved()).toBe(true);
  });

  it('reports storage failures without hiding the accepted publication identifier', async () => {
    offline.savePublicationTracking.mockRejectedValue(new Error('quota'));
    api.observe.mockRejectedValue(new Error('network'));
    store.publish(intervention);
    await flush();
    expect(store.publicationId()).toBe('p1');
    expect(store.storageError()).toContain('Keep this page open');
  });

  it('announces slow observation and cancels the timer on settlement', async () => {
    vi.useFakeTimers();
    const result = new Subject<PublicationOutput>();
    api.observe.mockReturnValue(lastValueFrom(result));
    store.publish(intervention);
    await flush();
    vi.advanceTimersByTime(30_000);
    await flush();
    expect(store.longRunning()).toBe(true);
    result.next(completed);
    result.complete();
    await flush();
    expect(store.longRunning()).toBe(false);
    expect(store.publishing()).toBe(false);
  });
  it('persists a late acceptance for the original intervention after navigation without changing the current workspace', async () => {
    const acceptance = new Subject<PublicationOutput>();
    api.start.mockReturnValue(lastValueFrom(acceptance));
    store.publish(intervention);
    await flush();
    store.restore({ organization: intervention.organization, interventionId: 'i2' });
    await flush();
    acceptance.next(accepted);
    acceptance.complete();
    await flush();
    expect(offline.savePublicationTracking).toHaveBeenCalledWith(
      intervention.organization,
      'i1',
      expect.objectContaining({ publicationId: 'p1' }),
    );
    expect(store.publicationId()).toBeNull();
    expect(api.observe).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('reloads recovery metadata when the account changes within the same route', async () => {
    store.restore({ organization: intervention.organization, interventionId: intervention.id });
    await flush();
    offline.publicationOwner.mockReturnValue('account-2');
    store.restore({ organization: intervention.organization, interventionId: intervention.id });
    await flush();
    expect(offline.loadPublicationTracking).toHaveBeenCalledTimes(2);
    expect(store.publicationId()).toBeNull();
  });
});
