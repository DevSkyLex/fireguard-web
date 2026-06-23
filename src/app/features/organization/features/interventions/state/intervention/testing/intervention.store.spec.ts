import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionStore } from '../intervention.store';

const intervention = { id: 'intervention-1', name: 'Site visit' } as InterventionOutput;
const collection: HydraCollection<InterventionOutput> = {
  '@id': '/api/interventions',
  '@type': 'Collection',
  totalItems: 1,
  member: [intervention],
};

describe('InterventionStore', () => {
  let store: InstanceType<typeof InterventionStore>;
  let mockInterventionService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInterventionService = {
      list: vi.fn().mockReturnValue(of(collection)),
      create: vi.fn().mockReturnValue(of(intervention)),
    };
    dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        InterventionStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InterventionService, useValue: mockInterventionService },
      ],
    });

    store = TestBed.inject(InterventionStore);
  });

  it('should load interventions for an organization', () => {
    store.load({ organizationId: 'org-1' });

    expect(mockInterventionService.list).toHaveBeenCalledWith('org-1', undefined);
    expect(store.interventionList()).toEqual([intervention]);
    expect(store.totalInterventions()).toBe(1);
    expect(store.isLoadingInterventions()).toBe(false);
    expect(store.isEmpty()).toBe(false);
  });

  it('should create a intervention and expose it for navigation handoff', () => {
    store.create({ organizationId: 'org-1', name: 'Site visit' });

    expect(mockInterventionService.create).toHaveBeenCalledWith('org-1', 'Site visit');
    expect(store.createdIntervention()).toEqual(intervention);
    expect(store.interventionList()).toEqual([intervention]);
    expect(store.totalInterventions()).toBe(1);
  });

  it('should clear the created intervention handoff', () => {
    store.create({ organizationId: 'org-1', name: 'Site visit' });
    store.clearCreatedIntervention();

    expect(store.createdIntervention()).toBeNull();
  });

  it('should dispatch a failure event when loading fails', () => {
    mockInterventionService.list.mockReturnValue(throwError(() => new Error('network')));

    store.load({ organizationId: 'org-1' });

    expect(store.listCallState().status).toBe('error');
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should dispatch a failure event when creation fails', () => {
    mockInterventionService.create.mockReturnValue(throwError(() => new Error('network')));

    store.create({ organizationId: 'org-1', name: 'Site visit' });

    expect(store.createCallState().status).toBe('error');
    expect(store.createdIntervention()).toBeNull();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
