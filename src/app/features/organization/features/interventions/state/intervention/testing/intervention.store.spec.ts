import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { NEVER, of, throwError } from 'rxjs';
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
    update: ReturnType<typeof vi.fn>;
  };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInterventionService = {
      list: vi.fn().mockReturnValue(of(collection)),
      create: vi.fn().mockReturnValue(of(intervention)),
      update: vi.fn(),
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

    expect(mockInterventionService.list).toHaveBeenCalledWith('org-1', {
      page: 1,
      itemsPerPage: 100,
    });
    expect(store.interventionList()).toEqual([intervention]);
    expect(store.totalInterventions()).toBe(1);
    expect(store.isLoadingInterventions()).toBe(false);
    expect(store.isEmpty()).toBe(false);
    expect(store.isListCapped()).toBe(false);
  });

  it('should accumulate up to 500 interventions across 100-item pages and flag the cap', () => {
    const pageOf = (page: number, totalItems: number): HydraCollection<InterventionOutput> => ({
      '@id': '/api/interventions',
      '@type': 'Collection',
      totalItems,
      member: Array.from(
        { length: 100 },
        (_, index) => ({ id: `i-${(page - 1) * 100 + index}` }) as InterventionOutput,
      ),
    });
    mockInterventionService.list.mockImplementation(
      (_organizationId: string, options: { page: number }) => of(pageOf(options.page, 650)),
    );

    store.load({ organizationId: 'org-1' });

    expect(mockInterventionService.list).toHaveBeenCalledTimes(5);
    expect(store.interventionList()).toHaveLength(500);
    expect(store.totalInterventions()).toBe(650);
    expect(store.isListCapped()).toBe(true);
  });

  it('should forward the name filter while paginating', () => {
    store.load({ organizationId: 'org-1', options: { name: 'roof' } });

    expect(mockInterventionService.list).toHaveBeenCalledWith('org-1', {
      name: 'roof',
      page: 1,
      itemsPerPage: 100,
    });
  });

  it('should create an intervention and expose it for navigation handoff', () => {
    store.create({ organizationId: 'org-1', name: 'Site visit' });

    expect(mockInterventionService.create).toHaveBeenCalledWith(
      'org-1',
      'Site visit',
      expect.any(Object),
    );
    expect(store.createdIntervention()).toEqual(intervention);
    expect(store.interventionList()).toEqual([intervention]);
    expect(store.totalInterventions()).toBe(1);
  });

  it('should dispatch a created event carrying the new intervention on success', () => {
    store.create({ organizationId: 'org-1', name: 'Site visit' });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0]).toMatchObject({ payload: intervention });
  });

  it('should forward the guided-creation options to the service', () => {
    const plannedStartAt = new Date('2026-07-08T09:00:00Z');
    store.create({
      organizationId: 'org-1',
      name: 'Site visit',
      type: 'inspection_campaign',
      priority: 'high',
      participants: ['/api/organizations/org-1/members/m1'],
      plannedStartAt,
    });

    expect(mockInterventionService.create).toHaveBeenCalledWith(
      'org-1',
      'Site visit',
      expect.objectContaining({
        type: 'inspection_campaign',
        priority: 'high',
        participants: ['/api/organizations/org-1/members/m1'],
        plannedStartAt,
      }),
    );
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

  it('should expose the load error and not report empty on a failed load', () => {
    mockInterventionService.list.mockReturnValue(throwError(() => new Error('network')));

    store.load({ organizationId: 'org-1' });

    expect(store.listError()).not.toBeNull();
    expect(store.isEmpty()).toBe(false);
  });

  it('should report empty only on a successful load with no items', () => {
    mockInterventionService.list.mockReturnValue(
      of({ '@id': '/api/interventions', '@type': 'Collection', totalItems: 0, member: [] }),
    );

    store.load({ organizationId: 'org-1' });

    expect(store.listError()).toBeNull();
    expect(store.isEmpty()).toBe(true);
  });

  it('should dispatch a failure event when creation fails', () => {
    mockInterventionService.create.mockReturnValue(throwError(() => new Error('network')));

    store.create({ organizationId: 'org-1', name: 'Site visit' });

    expect(store.createCallState().status).toBe('error');
    expect(store.createdIntervention()).toBeNull();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should expose the entity order as orderedIds', () => {
    store.load({ organizationId: 'org-1' });

    expect(store.orderedIds()).toEqual(['intervention-1']);
  });

  describe('transition', () => {
    const draftIntervention = {
      id: 'intervention-1',
      name: 'Site visit',
      status: 'draft',
      revision: 1,
    } as InterventionOutput;

    beforeEach(() => {
      mockInterventionService.list.mockReturnValue(
        of({
          '@id': '/api/interventions',
          '@type': 'Collection',
          totalItems: 1,
          member: [draftIntervention],
        }),
      );
      store.load({ organizationId: 'org-1' });
    });

    it('should optimistically patch the entity status before the request resolves', () => {
      // Never resolves, so the assertion observes the state right after the
      // optimistic patch and before any server response could apply.
      mockInterventionService.update.mockReturnValue(NEVER);

      store.transition({ id: 'intervention-1', status: 'planned', revision: 1 });

      expect(store.interventionList()[0]).toMatchObject({ status: 'planned' });
      expect(store.transitionCallState().status).toBe('pending');
      expect(mockInterventionService.update).toHaveBeenCalledWith(
        'intervention-1',
        { status: 'planned' },
        1,
      );
    });

    it('should merge the fresh server entity on success', () => {
      const updated = {
        ...draftIntervention,
        status: 'planned',
        revision: 2,
        allowedTransitions: ['in_progress'],
      } as InterventionOutput;
      mockInterventionService.update.mockReturnValue(of(updated));

      store.transition({ id: 'intervention-1', status: 'planned', revision: 1 });

      expect(store.interventionList()[0]).toEqual(updated);
      expect(store.transitionCallState().status).toBe('success');
    });

    it('should roll back the optimistic patch and dispatch a failure event on error', () => {
      mockInterventionService.update.mockReturnValue(throwError(() => new Error('conflict')));

      store.transition({ id: 'intervention-1', status: 'planned', revision: 1 });

      expect(store.interventionList()[0]).toEqual(draftIntervention);
      expect(store.transitionCallState().status).toBe('error');
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0]).toMatchObject({
        type: '[Intervention Store] transitionFailed',
      });
    });
  });
});
