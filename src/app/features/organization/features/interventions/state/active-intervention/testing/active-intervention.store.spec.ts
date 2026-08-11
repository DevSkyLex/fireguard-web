import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { NEVER, of, throwError } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { ActiveInterventionStore } from '../active-intervention.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveInterventionStore', () => {
  let store: InstanceType<typeof ActiveInterventionStore>;
  let dispatch: ReturnType<typeof vi.fn>;
  let mockInterventionService: {
    get: ReturnType<typeof vi.fn>;
  };

  const intervention = {
    id: 'intervention-1',
    name: 'Spring audit',
  } as unknown as InterventionOutput;

  beforeEach(() => {
    dispatch = vi.fn();
    mockInterventionService = {
      get: vi.fn().mockReturnValue(of(intervention)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InterventionService, useValue: mockInterventionService },
      ],
    });

    store = TestBed.inject(ActiveInterventionStore);
  });

  it('should resolve and expose the active intervention', async () => {
    store.resolveIntervention('intervention-1');
    await flushEffects();

    expect(mockInterventionService.get).toHaveBeenCalledWith('intervention-1');
    expect(store.selectedIntervention()).toEqual(intervention);
    expect(store.getCallState().status).toBe('success');
  });

  it('should clear the previous record while resolving a different id', () => {
    store.setIntervention(intervention);
    mockInterventionService.get.mockReturnValue(NEVER);

    store.resolveIntervention('intervention-2');

    expect(store.selectedIntervention()).toBeNull();
    expect(store.getCallState().status).toBe('pending');
  });

  it('should keep the current record on screen while re-resolving the same id', () => {
    store.setIntervention(intervention);
    mockInterventionService.get.mockReturnValue(NEVER);

    store.resolveIntervention('intervention-1');

    expect(store.selectedIntervention()).toEqual(intervention);
    expect(store.getCallState().status).toBe('pending');
  });

  it('should record an error and dispatch when the fetch fails', async () => {
    mockInterventionService.get.mockReturnValue(throwError(() => new Error('boom')));

    store.resolveIntervention('intervention-1');
    await flushEffects();

    expect(store.selectedIntervention()).toBeNull();
    expect(store.getCallState().status).toBe('error');
    expect(dispatch).toHaveBeenCalled();
  });

  it('should clear the selected intervention', () => {
    store.setIntervention(intervention);
    store.clear();

    expect(store.selectedIntervention()).toBeNull();
    expect(store.getCallState().status).toBe('idle');
  });
});
