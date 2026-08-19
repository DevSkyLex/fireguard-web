import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { NEVER, of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  InterventionService,
  InterventionTemplateService,
} from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionStore } from '../intervention.store';

const intervention = { id: 'intervention-1', name: 'Site visit' } as InterventionOutput;
const collection: HydraCollection<InterventionOutput> = {
  '@id': '/api/interventions',
  '@type': 'Collection',
  totalItems: 1,
  member: [intervention],
};

const pageOf = (page: number, totalItems: number): HydraCollection<InterventionOutput> => ({
  '@id': '/api/interventions',
  '@type': 'Collection',
  totalItems,
  member: Array.from(
    { length: 100 },
    (_, index) => ({ id: `i-${(page - 1) * 100 + index}` }) as InterventionOutput,
  ),
});

describe('InterventionStore', () => {
  let store: InstanceType<typeof InterventionStore>;
  let mockInterventionService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let mockInterventionTemplateService: { instantiate: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInterventionService = {
      list: vi.fn().mockReturnValue(of(collection)),
      create: vi.fn().mockReturnValue(of(intervention)),
      update: vi.fn(),
      remove: vi.fn(),
    };
    mockInterventionTemplateService = {
      instantiate: vi.fn().mockReturnValue(of({ interventionId: 'intervention-2', number: 42 })),
    };
    dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        InterventionStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InterventionService, useValue: mockInterventionService },
        { provide: InterventionTemplateService, useValue: mockInterventionTemplateService },
      ],
    });

    store = TestBed.inject(InterventionStore);
  });

  it('should load interventions for an organization', () => {
    store.load({ organizationId: 'org-1' });

    expect(mockInterventionService.list).toHaveBeenCalledWith('org-1', {
      order: { createdAt: 'desc' },
    });
    expect(store.interventionList()).toEqual([intervention]);
    expect(store.totalInterventions()).toBe(1);
    expect(store.isLoadingInterventions()).toBe(false);
    expect(store.isEmpty()).toBe(false);
  });

  it('should fetch exactly the requested server page and keep the server total', () => {
    mockInterventionService.list.mockImplementation(
      (_organizationId: string, options: { page: number }) => of(pageOf(options.page, 650)),
    );

    store.load({ organizationId: 'org-1', options: { page: 3, itemsPerPage: 30 } });

    expect(mockInterventionService.list).toHaveBeenCalledTimes(1);
    expect(mockInterventionService.list).toHaveBeenCalledWith('org-1', {
      order: { createdAt: 'desc' },
      page: 3,
      itemsPerPage: 30,
    });
    expect(store.totalInterventions()).toBe(650);
  });

  it('should forward the name filter with the page window', () => {
    store.load({ organizationId: 'org-1', options: { name: 'roof', page: 1, itemsPerPage: 30 } });

    expect(mockInterventionService.list).toHaveBeenCalledWith('org-1', {
      order: { createdAt: 'desc' },
      name: 'roof',
      page: 1,
      itemsPerPage: 30,
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
    expect(store.createdInterventionId()).toBe('intervention-1');
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

    it('should track the id as transitioning while the request is in flight', () => {
      mockInterventionService.update.mockReturnValue(NEVER);

      store.transition({ id: 'intervention-1', status: 'planned', revision: 1 });

      expect(store.transitioningInterventionIds()).toEqual(['intervention-1']);
    });

    it('should clear the transitioning id on success', () => {
      mockInterventionService.update.mockReturnValue(
        of({ ...draftIntervention, status: 'planned', revision: 2 } as InterventionOutput),
      );

      store.transition({ id: 'intervention-1', status: 'planned', revision: 1 });

      expect(store.transitioningInterventionIds()).toEqual([]);
    });

    it('should clear the transitioning id on error', () => {
      mockInterventionService.update.mockReturnValue(throwError(() => new Error('conflict')));

      store.transition({ id: 'intervention-1', status: 'planned', revision: 1 });

      expect(store.transitioningInterventionIds()).toEqual([]);
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

  describe('delete', () => {
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

    it('should call remove with the id and revision', () => {
      mockInterventionService.remove.mockReturnValue(of(undefined));

      store.delete({ interventionId: 'intervention-1', revision: 1 });

      expect(mockInterventionService.remove).toHaveBeenCalledWith('intervention-1', 1);
    });

    it('should drop the entity and decrement the total on success', () => {
      mockInterventionService.remove.mockReturnValue(of(undefined));

      store.delete({ interventionId: 'intervention-1', revision: 1 });

      expect(store.interventionList()).toEqual([]);
      expect(store.totalInterventions()).toBe(0);
      expect(store.deleteCallState().status).toBe('success');
    });

    it('should dispatch a success feedback event on success', () => {
      mockInterventionService.remove.mockReturnValue(of(undefined));

      store.delete({ interventionId: 'intervention-1', revision: 1 });

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0]).toMatchObject({
        type: '[Intervention Store] deleteSucceeded',
        payload: { severity: 'success' },
      });
    });

    it('should keep the entity and dispatch a failure event on a 409 status conflict', () => {
      mockInterventionService.remove.mockReturnValue(
        throwError(() => ({
          '@type': 'ApiError',
          status: 409,
          type: '/errors/conflict',
          title: 'Conflict',
        })),
      );

      store.delete({ interventionId: 'intervention-1', revision: 1 });

      expect(store.interventionList()).toEqual([draftIntervention]);
      expect(store.deleteCallState().status).toBe('error');
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0]).toMatchObject({
        type: '[Intervention Store] deleteFailed',
        payload: { severity: 'error' },
      });
    });

    it('should not remove the row it was not asked to delete', () => {
      mockInterventionService.remove.mockReturnValue(of(undefined));

      store.delete({ interventionId: 'does-not-exist', revision: 1 });

      expect(store.interventionList()).toEqual([draftIntervention]);
    });

    it('should report isDeleting while the write is in flight', () => {
      mockInterventionService.remove.mockReturnValue(NEVER);

      expect(store.isDeleting()).toBe(false);

      store.delete({ interventionId: 'intervention-1', revision: 1 });

      expect(store.isDeleting()).toBe(true);
    });

    it('should expose the delete error and stop reporting isDeleting on failure', () => {
      mockInterventionService.remove.mockReturnValue(
        throwError(() => ({
          '@type': 'ApiError',
          status: 409,
          type: '/errors/conflict',
          title: 'Conflict',
        })),
      );

      store.delete({ interventionId: 'intervention-1', revision: 1 });

      expect(store.isDeleting()).toBe(false);
      expect(store.deleteError()).not.toBeNull();
    });

    it('should reset the delete call state back to idle', () => {
      mockInterventionService.remove.mockReturnValue(
        throwError(() => ({
          '@type': 'ApiError',
          status: 409,
          type: '/errors/conflict',
          title: 'Conflict',
        })),
      );
      store.delete({ interventionId: 'intervention-1', revision: 1 });
      expect(store.deleteError()).not.toBeNull();

      store.resetDeleteState();

      expect(store.deleteError()).toBeNull();
      expect(store.deleteCallState().status).toBe('idle');
    });
  });

  describe('assignResponsible', () => {
    const draftIntervention = {
      id: 'intervention-1',
      name: 'Site visit',
      status: 'draft',
      revision: 1,
      responsible: null,
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

    it('should optimistically patch the entity responsible before the request resolves', () => {
      mockInterventionService.update.mockReturnValue(NEVER);

      store.assignResponsible({
        interventionId: 'intervention-1',
        responsible: '/api/organizations/org-1/members/m1',
        revision: 1,
      });

      expect(store.interventionList()[0]).toMatchObject({
        responsible: '/api/organizations/org-1/members/m1',
      });
      expect(store.assignCallState().status).toBe('pending');
      expect(mockInterventionService.update).toHaveBeenCalledWith(
        'intervention-1',
        { responsible: '/api/organizations/org-1/members/m1' },
        1,
      );
    });

    it('should merge the fresh server entity and dispatch a success feedback event', () => {
      const updated = {
        ...draftIntervention,
        responsible: '/api/organizations/org-1/members/m1',
        revision: 2,
        allowedTransitions: ['planned'],
      } as InterventionOutput;
      mockInterventionService.update.mockReturnValue(of(updated));

      store.assignResponsible({
        interventionId: 'intervention-1',
        responsible: '/api/organizations/org-1/members/m1',
        revision: 1,
      });

      expect(store.interventionList()[0]).toEqual(updated);
      expect(store.assignCallState().status).toBe('success');
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0]).toMatchObject({
        type: '[Intervention Store] assignSucceeded',
        payload: { severity: 'success' },
      });
    });

    it('should roll back the optimistic patch and dispatch a failure event on error', () => {
      mockInterventionService.update.mockReturnValue(
        throwError(() => ({
          '@type': 'ApiError',
          status: 403,
          type: '/errors/forbidden',
          title: 'Forbidden',
        })),
      );

      store.assignResponsible({
        interventionId: 'intervention-1',
        responsible: '/api/organizations/org-1/members/m1',
        revision: 1,
      });

      expect(store.interventionList()[0]).toEqual(draftIntervention);
      expect(store.assignCallState().status).toBe('error');
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0]).toMatchObject({
        type: '[Intervention Store] assignFailed',
        payload: { severity: 'error' },
      });
    });
  });

  describe('instantiateFromTemplate', () => {
    it('should instantiate a template and expose the created id for navigation handoff', () => {
      store.instantiateFromTemplate({ templateId: 'template-1' });

      expect(mockInterventionTemplateService.instantiate).toHaveBeenCalledWith('template-1', {
        name: undefined,
        site: undefined,
        responsible: undefined,
        plannedStartAt: undefined,
      });
      expect(store.createdInterventionId()).toBe('intervention-2');
      expect(store.isInstantiatingFromTemplate()).toBe(false);
    });

    it('should forward the drafted overrides to the template service', () => {
      const plannedStartAt = new Date('2026-03-01T09:00:00.000Z');

      store.instantiateFromTemplate({
        templateId: 'template-1',
        name: 'Spring round',
        site: '/api/facilities/site-1',
        responsible: '/api/organizations/org-1/members/member-1',
        plannedStartAt,
      });

      expect(mockInterventionTemplateService.instantiate).toHaveBeenCalledWith('template-1', {
        name: 'Spring round',
        site: '/api/facilities/site-1',
        responsible: '/api/organizations/org-1/members/member-1',
        plannedStartAt,
      });
    });

    it('should dispatch a failure event and surface the error when instantiation fails', () => {
      mockInterventionTemplateService.instantiate.mockReturnValue(
        throwError(() => ({
          '@type': 'ApiError',
          status: 404,
          type: '/errors/not-found',
          title: 'Not Found',
        })),
      );

      store.instantiateFromTemplate({ templateId: 'template-1' });

      expect(store.createdInterventionId()).toBeNull();
      expect(store.instantiateFromTemplateError()).not.toBeNull();
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0][0]).toMatchObject({
        type: '[Intervention Store] instantiateFailed',
      });
    });

    it('should clear the instantiate handoff', () => {
      store.instantiateFromTemplate({ templateId: 'template-1' });
      store.clearCreatedIntervention();

      expect(store.createdInterventionId()).toBeNull();
    });
  });

  describe('pendingDuplicatePrefill', () => {
    it('should hold nothing until the detail page sets a handoff', () => {
      expect(store.pendingDuplicatePrefill()).toBeNull();
    });

    it('should record and clear the cross-route duplicate handoff', () => {
      store.setPendingDuplicatePrefill({
        name: 'Site visit (copy)',
        type: 'inventory',
        priority: 'normal',
        site: '',
        responsible: '',
      });

      expect(store.pendingDuplicatePrefill()).toEqual({
        name: 'Site visit (copy)',
        type: 'inventory',
        priority: 'normal',
        site: '',
        responsible: '',
      });

      store.clearPendingDuplicatePrefill();

      expect(store.pendingDuplicatePrefill()).toBeNull();
    });
  });
});
