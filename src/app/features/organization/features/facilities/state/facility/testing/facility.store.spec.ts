import { PLATFORM_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { ApiError, HydraCollection, OptionOutput } from '@core/api/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ActiveFacilityStore } from '../../active-facility/active-facility.store';
import { FacilityStore } from '../facility.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

const apiError = (status: number, detail: string): ApiError => ({
  '@id': '',
  '@type': 'Error',
  status,
  type: 'about:blank',
  title: 'Error',
  detail,
  instance: null,
});

describe('FacilityStore', () => {
  let store: FacilityStore;
  let mockFacilityService: {
    list: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
    listDescendants: ReturnType<typeof vi.fn>;
    listTypes: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    archive: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    move: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let selectedFacilitySignal: WritableSignal<FacilityOutput | null>;
  let mockActiveFacilityStore: {
    selectedFacility: WritableSignal<FacilityOutput | null>;
    isLoadingFacility: WritableSignal<boolean>;
    setFacility: ReturnType<typeof vi.fn>;
  };

  const facility = { id: 'facility-1', name: 'HQ' } as unknown as FacilityOutput;
  const collection: HydraCollection<FacilityOutput> = {
    '@id': '/api/organizations/org-1/facilities',
    '@type': 'Collection',
    totalItems: 1,
    member: [facility],
  };
  const typesCollection: HydraCollection<OptionOutput> = {
    '@id': '/api/facility-types',
    '@type': 'Collection',
    totalItems: 1,
    member: [{ '@id': '/api/options/site', '@type': 'Option', value: 'site', label: 'Site' }],
  };

  beforeEach(() => {
    mockFacilityService = {
      list: vi.fn().mockReturnValue(of(collection)),
      listChildren: vi.fn().mockReturnValue(of(collection)),
      listDescendants: vi.fn().mockReturnValue(of(collection)),
      listTypes: vi.fn().mockReturnValue(of(typesCollection)),
      create: vi.fn().mockReturnValue(of(facility)),
      update: vi.fn().mockReturnValue(of(facility)),
      archive: vi.fn().mockReturnValue(of(facility)),
      restore: vi.fn().mockReturnValue(of(facility)),
      move: vi.fn().mockReturnValue(of(facility)),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };
    mockDispatcher = { dispatch: vi.fn() };
    selectedFacilitySignal = signal<FacilityOutput | null>(null);
    mockActiveFacilityStore = {
      selectedFacility: selectedFacilitySignal,
      isLoadingFacility: signal(false),
      setFacility: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        FacilityStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: FacilityService, useValue: mockFacilityService },
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(FacilityStore);
  });

  it('should load facilities', async () => {
    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockFacilityService.list).toHaveBeenCalledWith('org-1', undefined);
    expect(store.facilities()).toEqual([facility]);
    expect(store.totalFacilities()).toBe(1);
  });

  it('should load facility types', async () => {
    store.loadTypes();
    await flushEffects();

    expect(mockFacilityService.listTypes).toHaveBeenCalledTimes(1);
    expect(store.facilityTypes()).toEqual(typesCollection.member);
    expect(store.typesCallState().status).toBe('success');
  });

  it('should load root facilities scoped with a null parent', async () => {
    store.loadRootFacilities({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockFacilityService.list).toHaveBeenCalledWith('org-1', { rootsOnly: true });
    expect(store.rootFacilities()).toEqual([facility]);
    expect(store.totalRootFacilities()).toBe(1);
    expect(store.isLoadingRootFacilities()).toBe(false);
  });

  it('should lazily load child facilities for a parent', async () => {
    const child = { id: 'facility-2', name: 'Floor 1' } as unknown as FacilityOutput;
    const childCollection: HydraCollection<FacilityOutput> = {
      '@id': '/api/organizations/org-1/facilities',
      '@type': 'Collection',
      totalItems: 1,
      member: [child],
    };
    mockFacilityService.listChildren.mockReturnValueOnce(of(childCollection));

    store.loadChildFacilities({ organizationId: 'org-1', parentFacilityId: 'facility-1' });
    await flushEffects();

    expect(mockFacilityService.listChildren).toHaveBeenCalledWith('org-1', 'facility-1', {
      page: 1,
      itemsPerPage: 30,
    });
    expect(store.childFacilitiesByParent()['facility-1']).toEqual([child]);
    expect(store.loadedParentIds()).toContain('facility-1');
    expect(store.loadingParentIds()).not.toContain('facility-1');
  });

  it('should load descendants and build the hierarchy map', async () => {
    const child = {
      id: 'facility-2',
      name: 'Floor 1',
      parentFacilityId: 'facility-1',
    } as unknown as FacilityOutput;
    const grandChild = {
      id: 'facility-3',
      name: 'Zone A',
      parentFacilityId: 'facility-2',
    } as unknown as FacilityOutput;
    const descendantsCollection: HydraCollection<FacilityOutput> = {
      '@id': '/api/organizations/org-1/facilities/facility-1/descendants',
      '@type': 'Collection',
      totalItems: 2,
      member: [child, grandChild],
    };
    mockFacilityService.listDescendants.mockReturnValueOnce(of(descendantsCollection));

    store.loadFacilityDescendants({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(mockFacilityService.listDescendants).toHaveBeenCalledWith('org-1', 'facility-1');
    expect(store.childFacilitiesByParent()['facility-1']).toEqual([child]);
    expect(store.childFacilitiesByParent()['facility-2']).toEqual([grandChild]);
    expect(store.loadedParentIds()).toEqual(['facility-1', 'facility-2', 'facility-3']);
    expect(store.loadingParentIds()).not.toContain('facility-1');
  });

  it('should reset expansion maps when root facilities reload', async () => {
    const child = { id: 'facility-2', name: 'Floor 1' } as unknown as FacilityOutput;
    const childCollection: HydraCollection<FacilityOutput> = {
      '@id': '/api/organizations/org-1/facilities',
      '@type': 'Collection',
      totalItems: 1,
      member: [child],
    };
    mockFacilityService.listChildren.mockReturnValueOnce(of(childCollection));

    store.loadChildFacilities({ organizationId: 'org-1', parentFacilityId: 'facility-1' });
    await flushEffects();
    expect(store.loadedParentIds()).toContain('facility-1');

    store.loadRootFacilities({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.childFacilitiesByParent()).toEqual({});
    expect(store.loadedParentIds()).toEqual([]);
    expect(store.rootFacilities()).toEqual([facility]);
  });

  it('should lazily load children through the guard on first request', async () => {
    store.ensureChildFacilitiesLoaded({ organizationId: 'org-1', parentFacilityId: 'facility-1' });
    await flushEffects();

    expect(mockFacilityService.listChildren).toHaveBeenCalledWith('org-1', 'facility-1', {
      page: 1,
      itemsPerPage: 30,
    });
    expect(store.loadedParentIds()).toContain('facility-1');
  });

  it('should skip the guarded load when children are already loaded', async () => {
    store.ensureChildFacilitiesLoaded({ organizationId: 'org-1', parentFacilityId: 'facility-1' });
    await flushEffects();
    expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);

    store.ensureChildFacilitiesLoaded({ organizationId: 'org-1', parentFacilityId: 'facility-1' });
    await flushEffects();

    expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
  });

  it('should load descendants through the guard on first request', async () => {
    store.ensureFacilityDescendantsLoaded({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(mockFacilityService.listDescendants).toHaveBeenCalledWith('org-1', 'facility-1');
    expect(store.loadedParentIds()).toContain('facility-1');
  });

  describe('remove', () => {
    it('should delete the facility, drop it from the collection and dispatch a success toast', async () => {
      store.load({ organizationId: 'org-1' });
      await flushEffects();
      expect(store.facilities()).toEqual([facility]);

      store.remove({ facilityId: 'facility-1' });
      await flushEffects();

      expect(mockFacilityService.remove).toHaveBeenCalledWith('facility-1');
      expect(store.deleteCallState().status).toBe('success');
      expect(store.facilities()).toEqual([]);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] deleteSucceeded' }),
      );
    });

    it('should surface a 409 conflict (facility still has children) as an error toast', async () => {
      mockFacilityService.remove.mockReturnValueOnce(
        throwError(() => ({
          '@id': '',
          '@type': 'Error',
          status: 409,
          type: 'about:blank',
          title: 'Conflict',
          detail:
            'Cannot delete a facility that still has child facilities; move or remove them first.',
          instance: null,
        })),
      );

      store.remove({ facilityId: 'facility-1' });
      await flushEffects();

      expect(store.deleteCallState().status).toBe('error');
      expect(store.deleteCallState().error?.code).toBe(409);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '[Facility Store] deleteFailed',
          payload: expect.objectContaining({
            message:
              'Cannot delete a facility that still has child facilities; move or remove them first.',
          }),
        }),
      );
    });
  });

  describe('load error paths', () => {
    it('should surface a load failure and dispatch listFailed', async () => {
      mockFacilityService.list.mockReturnValueOnce(throwError(() => apiError(500, 'Server error')));

      store.load({ organizationId: 'org-1' });
      await flushEffects();

      expect(store.listCallState().status).toBe('error');
      expect(store.listCallState().error?.code).toBe(500);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] listFailed' }),
      );
    });

    it('should surface a loadRootFacilities failure and dispatch listFailed', async () => {
      mockFacilityService.list.mockReturnValueOnce(throwError(() => apiError(500, 'Server error')));

      store.loadRootFacilities({ organizationId: 'org-1' });
      await flushEffects();

      expect(store.rootListCallState().status).toBe('error');
      expect(store.rootListCallState().error?.code).toBe(500);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] listFailed' }),
      );
    });

    it('should surface a loadChildFacilities failure, clear the loading marker and dispatch listFailed', async () => {
      mockFacilityService.listChildren.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.loadChildFacilities({ organizationId: 'org-1', parentFacilityId: 'facility-1' });
      await flushEffects();

      expect(store.loadingParentIds()).not.toContain('facility-1');
      expect(store.loadedParentIds()).not.toContain('facility-1');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] listFailed' }),
      );
    });

    it('should surface a loadFacilityDescendants failure, clear the loading marker and dispatch listFailed', async () => {
      mockFacilityService.listDescendants.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.loadFacilityDescendants({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(store.loadingParentIds()).not.toContain('facility-1');
      expect(store.loadedParentIds()).not.toContain('facility-1');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] listFailed' }),
      );
    });

    it('should surface a loadTypes failure and dispatch typesFailed', async () => {
      mockFacilityService.listTypes.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.loadTypes();
      await flushEffects();

      expect(store.typesCallState().status).toBe('error');
      expect(store.typesCallState().error?.code).toBe(500);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] typesFailed' }),
      );
    });
  });

  describe('ensureParentOptionsLoaded', () => {
    it('should load parent options in the browser when idle', async () => {
      store.ensureParentOptionsLoaded('org-1');
      await flushEffects();

      expect(mockFacilityService.list).toHaveBeenCalledWith('org-1', { itemsPerPage: 200 });
    });

    it('should not load parent options while a list request is already pending or succeeded', async () => {
      store.load({ organizationId: 'org-1' });
      await flushEffects();
      mockFacilityService.list.mockClear();

      store.ensureParentOptionsLoaded('org-1');
      await flushEffects();

      expect(mockFacilityService.list).not.toHaveBeenCalled();
    });

    it('should not load parent options outside the browser', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          FacilityStore,
          { provide: Dispatcher, useValue: mockDispatcher },
          { provide: FacilityService, useValue: mockFacilityService },
          { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const serverStore = TestBed.inject(FacilityStore);

      serverStore.ensureParentOptionsLoaded('org-1');
      await flushEffects();

      expect(mockFacilityService.list).not.toHaveBeenCalled();
    });
  });

  describe('ensureFacilityDescendantsLoaded', () => {
    it('should skip the guarded load when descendants are already loaded', async () => {
      store.ensureFacilityDescendantsLoaded({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();
      expect(mockFacilityService.listDescendants).toHaveBeenCalledTimes(1);

      store.ensureFacilityDescendantsLoaded({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(mockFacilityService.listDescendants).toHaveBeenCalledTimes(1);
    });

    it('should not load descendants outside the browser', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          FacilityStore,
          { provide: Dispatcher, useValue: mockDispatcher },
          { provide: FacilityService, useValue: mockFacilityService },
          { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const serverStore = TestBed.inject(FacilityStore);

      serverStore.ensureFacilityDescendantsLoaded({
        organizationId: 'org-1',
        facilityId: 'facility-1',
      });
      await flushEffects();

      expect(mockFacilityService.listDescendants).not.toHaveBeenCalled();
    });
  });

  describe('ensureChildFacilitiesLoaded browser guard', () => {
    it('should not load children outside the browser', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          FacilityStore,
          { provide: Dispatcher, useValue: mockDispatcher },
          { provide: FacilityService, useValue: mockFacilityService },
          { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const serverStore = TestBed.inject(FacilityStore);

      serverStore.ensureChildFacilitiesLoaded({
        organizationId: 'org-1',
        parentFacilityId: 'facility-1',
      });
      await flushEffects();

      expect(mockFacilityService.listChildren).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a facility, add it to the collection, bump the total and dispatch a success toast', async () => {
      store.create({ organizationId: 'org-1', input: { name: 'HQ' } as never });
      await flushEffects();

      expect(mockFacilityService.create).toHaveBeenCalledWith('org-1', { name: 'HQ' });
      expect(store.createCallState().status).toBe('success');
      expect(store.facilities()).toEqual([facility]);
      expect(store.totalFacilities()).toBe(1);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] createSucceeded' }),
      );
    });

    it('should surface a generic create failure and dispatch createFailed', async () => {
      mockFacilityService.create.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.create({ organizationId: 'org-1', input: { name: 'HQ' } as never });
      await flushEffects();

      expect(store.createCallState().status).toBe('error');
      expect(store.createCallState().error?.code).toBe(500);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] createFailed' }),
      );
    });

    it('should surface a quota-exceeded (409) create failure without dispatching createFailed', async () => {
      mockFacilityService.create.mockReturnValueOnce(
        throwError(() => apiError(409, 'Facility quota exceeded')),
      );

      store.create({ organizationId: 'org-1', input: { name: 'HQ' } as never });
      await flushEffects();

      expect(store.createCallState().status).toBe('error');
      expect(store.createCallState().error?.code).toBe(409);
      expect(mockDispatcher.dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] createFailed' }),
      );
    });
  });

  describe('update', () => {
    it('should update a facility, sync the entity and the active facility store, and dispatch a success toast', async () => {
      store.update({
        organizationId: 'org-1',
        facilityId: 'facility-1',
        input: { name: 'HQ 2' } as never,
      });
      await flushEffects();

      expect(mockFacilityService.update).toHaveBeenCalledWith('org-1', 'facility-1', {
        name: 'HQ 2',
      });
      expect(store.updateCallState().status).toBe('success');
      expect(mockActiveFacilityStore.setFacility).toHaveBeenCalledWith(facility);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] updateSucceeded' }),
      );
    });

    it('should surface an update failure and dispatch updateFailed', async () => {
      mockFacilityService.update.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.update({
        organizationId: 'org-1',
        facilityId: 'facility-1',
        input: { name: 'HQ 2' } as never,
      });
      await flushEffects();

      expect(store.updateCallState().status).toBe('error');
      expect(store.updateCallState().error?.code).toBe(500);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] updateFailed' }),
      );
    });
  });

  describe('archive', () => {
    it('should archive a facility, sync the entity and dispatch a success toast when it is the active facility', async () => {
      selectedFacilitySignal.set(facility);

      store.archive({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(mockFacilityService.archive).toHaveBeenCalledWith('org-1', 'facility-1');
      expect(store.archiveCallState().status).toBe('success');
      expect(mockActiveFacilityStore.setFacility).toHaveBeenCalledWith(facility);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] archiveSucceeded' }),
      );
    });

    it('should not sync the active facility store when the archived facility is not active', async () => {
      selectedFacilitySignal.set({ id: 'other-facility' } as unknown as FacilityOutput);

      store.archive({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(mockActiveFacilityStore.setFacility).not.toHaveBeenCalled();
    });

    it('should surface an archive failure and dispatch archiveFailed', async () => {
      mockFacilityService.archive.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.archive({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(store.archiveCallState().status).toBe('error');
      expect(store.archiveCallState().error?.code).toBe(500);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] archiveFailed' }),
      );
    });
  });

  describe('restore', () => {
    it('should restore a facility, sync the entity and dispatch a success toast when it is the active facility', async () => {
      selectedFacilitySignal.set(facility);

      store.restore({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(mockFacilityService.restore).toHaveBeenCalledWith('org-1', 'facility-1');
      expect(store.restoreCallState().status).toBe('success');
      expect(mockActiveFacilityStore.setFacility).toHaveBeenCalledWith(facility);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] restoreSucceeded' }),
      );
    });

    it('should not sync the active facility store when the restored facility is not active', async () => {
      selectedFacilitySignal.set(null);

      store.restore({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(mockActiveFacilityStore.setFacility).not.toHaveBeenCalled();
    });

    it('should surface a restore failure and dispatch restoreFailed', async () => {
      mockFacilityService.restore.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.restore({ organizationId: 'org-1', facilityId: 'facility-1' });
      await flushEffects();

      expect(store.restoreCallState().status).toBe('error');
      expect(store.restoreCallState().error?.code).toBe(500);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] restoreFailed' }),
      );
    });
  });

  describe('move', () => {
    it('should move a facility, sync the entity and the active facility store, and dispatch a success toast', async () => {
      store.move({
        organizationId: 'org-1',
        facilityId: 'facility-1',
        input: { parentFacilityId: 'facility-parent' } as never,
      });
      await flushEffects();

      expect(mockFacilityService.move).toHaveBeenCalledWith('org-1', 'facility-1', {
        parentFacilityId: 'facility-parent',
      });
      expect(store.moveCallState().status).toBe('success');
      expect(mockActiveFacilityStore.setFacility).toHaveBeenCalledWith(facility);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] moveSucceeded' }),
      );
    });

    it('should surface a move failure and dispatch moveFailed', async () => {
      mockFacilityService.move.mockReturnValueOnce(throwError(() => apiError(500, 'Server error')));

      store.move({
        organizationId: 'org-1',
        facilityId: 'facility-1',
        input: { parentFacilityId: 'facility-parent' } as never,
      });
      await flushEffects();

      expect(store.moveCallState().status).toBe('error');
      expect(store.moveCallState().error?.code).toBe(500);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Facility Store] moveFailed' }),
      );
    });
  });

  describe('reset helpers', () => {
    it('should reset the create operation back to idle', async () => {
      store.create({ organizationId: 'org-1', input: { name: 'HQ' } as never });
      await flushEffects();
      expect(store.createCallState().status).toBe('success');

      store.resetCreateOperation();

      expect(store.createCallState().status).toBe('idle');
    });

    it('should reset the update operation back to idle', async () => {
      store.update({
        organizationId: 'org-1',
        facilityId: 'facility-1',
        input: { name: 'HQ 2' } as never,
      });
      await flushEffects();
      expect(store.updateCallState().status).toBe('success');

      store.resetUpdateOperation();

      expect(store.updateCallState().status).toBe('idle');
    });
  });

  describe('computed selectors', () => {
    it('should report isEmpty as true with no entities and no in-flight request', () => {
      expect(store.isEmpty()).toBe(true);
    });

    it('should report isEmpty as false once facilities are loaded', async () => {
      store.load({ organizationId: 'org-1' });
      await flushEffects();

      expect(store.isEmpty()).toBe(false);
    });

    it('should report isRootEmpty as true with no root entities and no in-flight request', () => {
      expect(store.isRootEmpty()).toBe(true);
    });

    it('should report isRootEmpty as false once root facilities are loaded', async () => {
      store.loadRootFacilities({ organizationId: 'org-1' });
      await flushEffects();

      expect(store.isRootEmpty()).toBe(false);
    });

    it('should proxy selectedFacility and isLoadingFacility from ActiveFacilityStore', () => {
      expect(store.selectedFacility()).toBeNull();
      expect(store.isLoadingFacility()).toBe(false);

      selectedFacilitySignal.set(facility);
      expect(store.selectedFacility()).toEqual(facility);
    });

    it('should report isLoadingFacilities while a list request is pending', () => {
      let sawPending = false;
      mockFacilityService.list.mockImplementationOnce(() => {
        sawPending = store.listCallState().status === 'pending';
        return of(collection);
      });

      store.load({ organizationId: 'org-1' });

      expect(sawPending).toBe(true);
    });

    it('should report isCreating while a create request is pending', () => {
      let sawPending = false;
      mockFacilityService.create.mockImplementationOnce(() => {
        sawPending = store.createCallState().status === 'pending';
        return of(facility);
      });

      store.create({ organizationId: 'org-1', input: { name: 'HQ' } as never });

      expect(sawPending).toBe(true);
    });

    it('should report isUpdating while an update request is pending', () => {
      let sawPending = false;
      mockFacilityService.update.mockImplementationOnce(() => {
        sawPending = store.updateCallState().status === 'pending';
        return of(facility);
      });

      store.update({
        organizationId: 'org-1',
        facilityId: 'facility-1',
        input: { name: 'HQ 2' } as never,
      });

      expect(sawPending).toBe(true);
    });

    it('should expose createError from the createCallState', async () => {
      mockFacilityService.create.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.create({ organizationId: 'org-1', input: { name: 'HQ' } as never });
      await flushEffects();

      expect(store.createError()?.code).toBe(500);
    });
  });
});
