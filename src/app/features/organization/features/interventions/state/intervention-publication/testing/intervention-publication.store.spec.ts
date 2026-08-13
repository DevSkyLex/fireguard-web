import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { lastValueFrom, Subject } from 'rxjs';
import type {
  InterventionOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';
import { InterventionPublicationService } from '@features/organization/features/interventions/services/intervention-publication';
import { InterventionPublicationStore } from '../intervention-publication.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('InterventionPublicationStore', () => {
  let store: InstanceType<typeof InterventionPublicationStore>;
  let dispatch: ReturnType<typeof vi.fn>;
  let publish: ReturnType<typeof vi.fn>;

  const intervention = { id: 'intervention-1' } as unknown as InterventionOutput;
  const completed = { id: 'pub-1', status: 'completed' } as unknown as PublicationOutput;

  beforeEach(() => {
    dispatch = vi.fn();
    publish = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        InterventionPublicationStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InterventionPublicationService, useValue: { publish } },
      ],
    });

    store = TestBed.inject(InterventionPublicationStore);
  });

  it('should transition request to polling to success and dispatch publishSucceeded', async () => {
    const subject = new Subject<PublicationOutput>();
    publish.mockReturnValue(lastValueFrom(subject));

    store.publish(intervention);
    await flushEffects();

    expect(publish).toHaveBeenCalledWith(intervention);
    expect(store.publishCallState().status).toBe('pending');
    expect(store.publishing()).toBe(true);

    subject.next(completed);
    subject.complete();
    await flushEffects();

    expect(store.publishCallState().status).toBe('success');
    expect(store.publishCallState().data).toEqual(completed);
    expect(store.publishing()).toBe(false);
    expect(store.error()).toBeNull();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should surface a terminal failed publication as an error without dispatching', async () => {
    const failed = {
      id: 'pub-1',
      status: 'failed',
      error: 'Compliance rules rejected the record',
    } as unknown as PublicationOutput;
    publish.mockResolvedValue(failed);

    store.publish(intervention);
    await flushEffects();

    expect(store.publishCallState().status).toBe('error');
    expect(store.error()).toBe('Compliance rules rejected the record');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should map a rejected request (including a polling timeout) to the fixed request-failed message', async () => {
    publish.mockRejectedValue(new Error('Publication polling timed out before a terminal status.'));

    store.publish(intervention);
    await flushEffects();

    expect(store.publishCallState().status).toBe('error');
    expect(store.error()).toBe('The publication request could not be completed.');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should reset to idle', async () => {
    publish.mockRejectedValue(new Error('boom'));
    store.publish(intervention);
    await flushEffects();

    store.reset();

    expect(store.publishCallState().status).toBe('idle');
    expect(store.error()).toBeNull();
  });
});
