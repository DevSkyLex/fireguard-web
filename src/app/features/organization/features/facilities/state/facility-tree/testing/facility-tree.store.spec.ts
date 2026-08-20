import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { Subject, of, throwError } from 'rxjs';
import type { ApiError, HydraCollection } from '@core/api/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { facilityTreeStoreEvents } from '../events';
import { FacilityTreeStore, type FacilityTreeStoreType } from '../facility-tree.store';

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
});

describe('FacilityTreeStore', () => {
  let store: FacilityTreeStoreType;
  let mockFacilityService: {
    list: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
    move: ReturnType<typeof vi.fn>;
    duplicate: ReturnType<typeof vi.fn>;
  };
  let dispatch: ReturnType<typeof vi.fn>;

  const root = { id: 'facility-root', name: 'HQ' } as unknown as FacilityOutput;
  const child = { id: 'facility-child', name: 'Floor 1' } as unknown as FacilityOutput;

  const rootsCollection: HydraCollection<FacilityOutput> = {
    '@id': '/api/organizations/org-1/facilities',
    '@type': 'Collection',
    totalItems: 1,
    member: [root],
  };
  const childrenCollection: HydraCollection<FacilityOutput> = {
    '@id': '/api/organizations/org-1/facilities/facility-root/children',
    '@type': 'Collection',
    totalItems: 1,
    member: [child],
  };

  beforeEach(() => {
    mockFacilityService = {
      list: vi.fn().mockReturnValue(of(rootsCollection)),
      listChildren: vi.fn().mockReturnValue(of(childrenCollection)),
      move: vi.fn(),
      duplicate: vi.fn(),
    };
    dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        FacilityTreeStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: FacilityService, useValue: mockFacilityService },
      ],
    });

    store = TestBed.inject(FacilityTreeStore);
  });

  describe('loadRoots', () => {
    it('should be idle with no roots before loading', () => {
      expect(store.rootsCallState().status).toBe('idle');
      expect(store.roots()).toEqual([]);
    });

    it('should transition from pending to success and populate roots', async () => {
      let sawPending = false;
      mockFacilityService.list.mockImplementationOnce(() => {
        sawPending = store.rootsCallState().status === 'pending';
        return of(rootsCollection);
      });

      store.loadRoots('org-1');
      expect(sawPending).toBe(true);
      await flushEffects();

      expect(mockFacilityService.list).toHaveBeenCalledWith('org-1', {
        rootsOnly: true,
        itemsPerPage: 100,
      });
      expect(store.rootsCallState().status).toBe('success');
      expect(store.roots()).toEqual([root]);
      expect(store.isLoadingRoots()).toBe(false);
      expect(store.hasRootsError()).toBe(false);
    });

    it('should be a no-op when no organization id is given', async () => {
      store.loadRoots(undefined);
      await flushEffects();

      expect(mockFacilityService.list).not.toHaveBeenCalled();
      expect(store.rootsCallState().status).toBe('idle');
    });

    it('should surface a roots load failure', async () => {
      mockFacilityService.list.mockReturnValueOnce(throwError(() => apiError(500, 'Server error')));

      store.loadRoots('org-1');
      await flushEffects();

      expect(store.rootsCallState().status).toBe('error');
      expect(store.rootsCallState().error?.code).toBe(500);
      expect(store.hasRootsError()).toBe(true);
      expect(store.roots()).toEqual([]);
    });
  });

  describe('loadChildren', () => {
    it('should populate childrenByParent and track expandingParentIds around the call', async () => {
      let sawExpanding = false;
      mockFacilityService.listChildren.mockImplementationOnce(() => {
        sawExpanding = store.expandingParentIds().includes('facility-root');
        return of(childrenCollection);
      });

      store.loadChildren({ organizationId: 'org-1', facilityId: 'facility-root' });
      expect(sawExpanding).toBe(true);
      await flushEffects();

      expect(mockFacilityService.listChildren).toHaveBeenCalledWith('org-1', 'facility-root', {
        itemsPerPage: 100,
      });
      expect(store.childrenByParent()['facility-root']).toEqual([child]);
      expect(store.expandingParentIds()).not.toContain('facility-root');
      expect(store.hasLoadedChildren('facility-root')).toBe(true);
    });

    it('should not re-call the service when the same parent is expanded again', async () => {
      store.loadChildren({ organizationId: 'org-1', facilityId: 'facility-root' });
      await flushEffects();
      expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
      expect(store.hasLoadedChildren('facility-root')).toBe(true);

      if (!store.hasLoadedChildren('facility-root')) {
        store.loadChildren({ organizationId: 'org-1', facilityId: 'facility-root' });
      }
      await flushEffects();

      expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
    });

    it('should expose expandingParentIds so a caller can skip re-invoking an in-flight parent', async () => {
      const inFlight = new Subject<HydraCollection<FacilityOutput>>();
      mockFacilityService.listChildren.mockReturnValueOnce(inFlight);

      store.loadChildren({ organizationId: 'org-1', facilityId: 'facility-root' });
      expect(store.expandingParentIds()).toEqual(['facility-root']);

      if (!store.expandingParentIds().includes('facility-root')) {
        store.loadChildren({ organizationId: 'org-1', facilityId: 'facility-root' });
      }
      await flushEffects();

      expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
      expect(store.expandingParentIds()).toEqual(['facility-root']);

      inFlight.next(childrenCollection);
      inFlight.complete();
      await flushEffects();

      expect(store.childrenByParent()['facility-root']).toEqual([child]);
      expect(store.expandingParentIds()).not.toContain('facility-root');
    });

    it('should surface a failure by recording the parent as failed and clearing expandingParentIds', async () => {
      mockFacilityService.listChildren.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.loadChildren({ organizationId: 'org-1', facilityId: 'facility-root' });
      await flushEffects();

      expect(store.failedParentIds()).toContain('facility-root');
      expect(store.expandingParentIds()).not.toContain('facility-root');
      expect(store.hasLoadedChildren('facility-root')).toBe(false);
    });

    it('should clear failedParentIds and succeed on retry after a failure', async () => {
      mockFacilityService.listChildren.mockReturnValueOnce(
        throwError(() => apiError(500, 'Server error')),
      );

      store.loadChildren({ organizationId: 'org-1', facilityId: 'facility-root' });
      await flushEffects();
      expect(store.failedParentIds()).toContain('facility-root');

      mockFacilityService.listChildren.mockReturnValueOnce(of(childrenCollection));

      store.loadChildren({ organizationId: 'org-1', facilityId: 'facility-root' });
      await flushEffects();

      expect(store.failedParentIds()).not.toContain('facility-root');
      expect(store.childrenByParent()['facility-root']).toEqual([child]);
      expect(store.hasLoadedChildren('facility-root')).toBe(true);
    });
  });

  describe('hasLoadedChildren', () => {
    it('should report false for a parent whose children were never fetched', () => {
      expect(store.hasLoadedChildren('unknown-parent')).toBe(false);
    });
  });

  describe('ensureChildrenLoaded', () => {
    it('loads a branch on the first call', async () => {
      store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-root' });
      await flushEffects();

      expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
      expect(store.hasLoadedChildren('facility-root')).toBe(true);
    });

    it('does not re-fetch an already-loaded branch', async () => {
      store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-root' });
      await flushEffects();

      store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-root' });
      await flushEffects();

      expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
    });

    it('does not issue a second request while the branch is already in flight', () => {
      mockFacilityService.listChildren.mockReturnValue(of(childrenCollection));

      store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-root' });
      store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-root' });

      expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
    });
  });

  describe('move', () => {
    const facilityA = {
      id: 'facility-a',
      name: 'A',
      parentFacilityId: null,
    } as unknown as FacilityOutput;
    const facilityB = {
      id: 'facility-b',
      name: 'B',
      parentFacilityId: null,
    } as unknown as FacilityOutput;

    beforeEach(async () => {
      mockFacilityService.list.mockReturnValue(
        of({ '@id': '', '@type': 'Collection', totalItems: 2, member: [facilityA, facilityB] }),
      );
      mockFacilityService.listChildren.mockReturnValue(
        of({ '@id': '', '@type': 'Collection', totalItems: 0, member: [] }),
      );

      store.loadRoots('org-1');
      await flushEffects();
      store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-b' });
      await flushEffects();
    });

    it('optimistically re-parents the facility and confirms it on success', async () => {
      const moved = { ...facilityA, parentFacilityId: 'facility-b' } as FacilityOutput;
      mockFacilityService.move.mockReturnValue(of(moved));

      store.move({
        organizationId: 'org-1',
        facilityId: 'facility-a',
        parentFacilityId: 'facility-b',
      });
      await flushEffects();

      expect(mockFacilityService.move).toHaveBeenCalledWith('org-1', 'facility-a', {
        parentFacilityId: 'facility-b',
      });
      expect(store.roots().map((f) => f.id)).toEqual(['facility-b']);
      expect(store.childrenByParent()['facility-b']?.map((f) => f.id)).toEqual(['facility-a']);
      expect(dispatch).toHaveBeenCalledWith(
        facilityTreeStoreEvents.moveSucceeded(expect.objectContaining({ severity: 'success' })),
      );
    });

    it('rolls back the optimistic re-parent and dispatches moveFailed on error', async () => {
      mockFacilityService.move.mockReturnValue(throwError(() => new Error('boom')));

      store.move({
        organizationId: 'org-1',
        facilityId: 'facility-a',
        parentFacilityId: 'facility-b',
      });
      await flushEffects();

      expect(store.roots().map((f) => f.id)).toEqual(['facility-a', 'facility-b']);
      expect(store.childrenByParent()['facility-b']).toEqual([]);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: facilityTreeStoreEvents.moveFailed.type }),
      );
    });
  });

  describe('duplicate', () => {
    const facilityA = {
      id: 'facility-a',
      name: 'A',
      parentFacilityId: null,
    } as unknown as FacilityOutput;

    beforeEach(async () => {
      mockFacilityService.list.mockReturnValue(
        of({ '@id': '', '@type': 'Collection', totalItems: 1, member: [facilityA] }),
      );

      store.loadRoots('org-1');
      await flushEffects();
    });

    it('inserts the duplicated root into the roots list on success', async () => {
      const duplicated = { ...facilityA, id: 'facility-a-copy' } as FacilityOutput;
      mockFacilityService.duplicate.mockReturnValue(of(duplicated));

      store.duplicate({ organizationId: 'org-1', facilityId: 'facility-a' });
      await flushEffects();

      expect(mockFacilityService.duplicate).toHaveBeenCalledWith('org-1', 'facility-a');
      expect(store.roots().map((f) => f.id)).toEqual(['facility-a', 'facility-a-copy']);
      expect(store.isDuplicating()).toBe(false);
      expect(dispatch).toHaveBeenCalledWith(
        facilityTreeStoreEvents.duplicateSucceeded(
          expect.objectContaining({ severity: 'success' }),
        ),
      );
    });

    it('inserts the duplicated copy into its parent branch when already loaded', async () => {
      mockFacilityService.listChildren.mockReturnValue(
        of({ '@id': '', '@type': 'Collection', totalItems: 0, member: [] }),
      );
      store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-a' });
      await flushEffects();

      const duplicated = {
        id: 'facility-a-child-copy',
        name: 'Child copy',
        parentFacilityId: 'facility-a',
      } as unknown as FacilityOutput;
      mockFacilityService.duplicate.mockReturnValue(of(duplicated));

      store.duplicate({ organizationId: 'org-1', facilityId: 'facility-a-child' });
      await flushEffects();

      expect(store.childrenByParent()['facility-a']?.map((f) => f.id)).toEqual([
        'facility-a-child-copy',
      ]);
    });

    it('dispatches duplicateFailed and leaves the tree unchanged on error', async () => {
      mockFacilityService.duplicate.mockReturnValue(throwError(() => new Error('boom')));

      store.duplicate({ organizationId: 'org-1', facilityId: 'facility-a' });
      await flushEffects();

      expect(store.roots().map((f) => f.id)).toEqual(['facility-a']);
      expect(store.isDuplicating()).toBe(false);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: facilityTreeStoreEvents.duplicateFailed.type }),
      );
    });
  });
});
