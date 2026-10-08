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
    get: ReturnType<typeof vi.fn>;
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
      get: vi.fn(),
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
        page: 1,
        includePath: true,
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
        page: 1,
        includePath: true,
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
      mockFacilityService.list.mockReturnValue(
        of({ ...rootsCollection, totalItems: 1, member: [facilityB] }),
      );
      mockFacilityService.listChildren.mockReturnValue(
        of({ ...childrenCollection, totalItems: 1, member: [moved] }),
      );

      store.move({
        organizationId: 'org-1',
        facilityId: 'facility-a',
        parentFacilityId: 'facility-b',
      });
      await flushEffects();

      expect(mockFacilityService.move).toHaveBeenCalledWith(
        'org-1',
        'facility-a',
        {
          parentFacilityId: 'facility-b',
        },
        0,
      );
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
  it('loads all root and branch pages with deduplication and retry preserving loaded records', () => {
    const first = Array.from({ length: 100 }, (_, i) => ({ ...root, id: 'root-' + i }));
    const final = { ...root, id: 'root-100' };
    mockFacilityService.list
      .mockReturnValueOnce(of({ ...rootsCollection, member: first, totalItems: 101 }))
      .mockReturnValueOnce(throwError(() => apiError(503, 'offline')))
      .mockReturnValueOnce(of({ ...rootsCollection, member: [first[99], final], totalItems: 101 }));
    store.loadRoots('org-1');
    store.loadMoreRoots('org-1');
    expect(store.roots()).toHaveLength(100);
    expect(store.rootsPage()).toBe(1);
    store.loadMoreRoots('org-1');
    expect(store.roots()).toHaveLength(101);
    expect(store.roots()[100].id).toBe('root-100');
    expect(store.canLoadMoreRoots()).toBe(false);
    expect(mockFacilityService.list).toHaveBeenLastCalledWith('org-1', {
      rootsOnly: true,
      page: 2,
      itemsPerPage: 100,
      includePath: true,
    });
    mockFacilityService.listChildren
      .mockReturnValueOnce(of({ ...childrenCollection, member: first, totalItems: 101 }))
      .mockReturnValueOnce(throwError(() => apiError(503, 'offline')))
      .mockReturnValueOnce(
        of({ ...childrenCollection, member: [first[99], final], totalItems: 101 }),
      );
    const input = { organizationId: 'org-1', facilityId: 'branch' };
    store.loadChildren(input);
    store.loadMoreChildren(input);
    expect(store.childrenByParent()['branch']).toHaveLength(100);
    expect(store.failedParentIds()).toContain('branch');
    store.loadMoreChildren(input);
    expect(store.childrenByParent()['branch']).toHaveLength(101);
    expect(store.failedParentIds()).not.toContain('branch');
    expect(store.canLoadMoreChildren('branch')).toBe(false);
  });

  it('refreshes the revision after a conflict and ignores concurrent moves without optimistic changes', () => {
    const original = { ...root, revision: 3, parentFacilityId: null };
    mockFacilityService.list.mockReturnValue(of({ ...rootsCollection, member: [original] }));
    store.loadRoots('org-1');
    const revisionRead = new Subject<FacilityOutput>();
    mockFacilityService.get.mockReturnValueOnce(revisionRead);
    mockFacilityService.move
      .mockReturnValueOnce(throwError(() => apiError(412, 'conflict')))
      .mockReturnValueOnce(of({ ...original, revision: 5, parentFacilityId: 'parent' }));
    store.move({ organizationId: 'org-1', facilityId: root.id, parentFacilityId: 'parent' });
    expect(store.moveCallState().status).toBe('error');
    expect(store.isMoving()).toBe(true);
    store.move({ organizationId: 'org-1', facilityId: root.id, parentFacilityId: 'ignored' });
    expect(mockFacilityService.move).toHaveBeenCalledTimes(1);
    expect(store.roots()[0].parentFacilityId).toBeNull();
    revisionRead.next({ ...original, revision: 4 });
    revisionRead.complete();
    store.move({ organizationId: 'org-1', facilityId: root.id, parentFacilityId: 'parent' });
    expect(mockFacilityService.move).toHaveBeenLastCalledWith(
      'org-1',
      root.id,
      { parentFacilityId: 'parent' },
      4,
    );
  });

  it('reloads source and destination page boundaries after a move and retries a failed refresh without losing rows', () => {
    const source = { ...root, id: 'source', parentFacilityId: null, hasChildren: true };
    const destination = { ...root, id: 'destination', parentFacilityId: null, hasChildren: true };
    const sourceChildren = Array.from({ length: 101 }, (_, index) => ({
      ...child,
      id: `source-child-${index}`,
      parentFacilityId: source.id,
      revision: 3,
    }));
    const destinationChildren = Array.from({ length: 101 }, (_, index) => ({
      ...child,
      id: `destination-child-${index}`,
      parentFacilityId: destination.id,
    }));
    const moved = { ...sourceChildren[0], parentFacilityId: destination.id, revision: 4 };
    const refreshSource = new Subject<HydraCollection<FacilityOutput>>();
    let movedOnServer = false;
    let failedSourceRefresh = false;
    mockFacilityService.list.mockReturnValue(
      of({ ...rootsCollection, member: [source, destination], totalItems: 2 }),
    );
    mockFacilityService.listChildren.mockImplementation(
      (_organizationId: string, parentId: string, options: { page: number }) => {
        if (movedOnServer && parentId === source.id && !failedSourceRefresh) {
          failedSourceRefresh = true;
          return refreshSource;
        }
        const children =
          parentId === source.id
            ? movedOnServer
              ? sourceChildren.slice(1)
              : sourceChildren
            : movedOnServer
              ? [moved, ...destinationChildren]
              : destinationChildren;
        return of({
          ...childrenCollection,
          member: children.slice((options.page - 1) * 100, options.page * 100),
          totalItems: children.length,
        });
      },
    );
    mockFacilityService.move.mockImplementation(() => {
      movedOnServer = true;
      return of(moved);
    });
    store.loadRoots('org-1');
    store.loadChildren({ organizationId: 'org-1', facilityId: source.id });
    store.loadChildren({ organizationId: 'org-1', facilityId: destination.id });
    store.move({ organizationId: 'org-1', facilityId: moved.id, parentFacilityId: destination.id });
    expect(store.childrenByParent()[source.id]).toHaveLength(99);
    expect(store.childPagesByParent()[source.id]).toBe(0);
    expect(store.childTotalsByParent()[source.id]).toBe(100);
    expect(store.childrenByParent()[destination.id]).toHaveLength(100);
    expect(store.childPagesByParent()[destination.id]).toBe(1);
    expect(store.childTotalsByParent()[destination.id]).toBe(102);

    refreshSource.error(apiError(503, 'offline'));
    expect(store.childrenByParent()[source.id]).toHaveLength(99);
    expect(store.failedParentIds()).toContain(source.id);
    store.loadMoreChildren({ organizationId: 'org-1', facilityId: source.id });
    expect(mockFacilityService.listChildren).toHaveBeenLastCalledWith('org-1', source.id, {
      page: 1,
      itemsPerPage: 100,
      includePath: true,
    });
    expect(store.childrenByParent()[source.id]).toEqual(sourceChildren.slice(1));
    expect(store.failedParentIds()).not.toContain(source.id);
    expect(store.canLoadMoreChildren(source.id)).toBe(false);
    store.loadMoreChildren({ organizationId: 'org-1', facilityId: destination.id });
    expect(store.childrenByParent()[destination.id]).toEqual([moved, ...destinationChildren]);
    expect(new Set(store.childrenByParent()[destination.id].map((item) => item.id)).size).toBe(102);
    expect(store.canLoadMoreChildren(destination.id)).toBe(false);
  });

  it('cancels an obsolete branch append when a successful move reloads its first page', () => {
    const source = { ...root, id: 'source', parentFacilityId: null };
    const destination = { ...root, id: 'destination', parentFacilityId: null };
    const children = Array.from({ length: 101 }, (_, index) => ({
      ...child,
      id: `child-${index}`,
      parentFacilityId: source.id,
    }));
    const obsoleteAppend = new Subject<HydraCollection<FacilityOutput>>();
    mockFacilityService.list.mockReturnValue(
      of({ ...rootsCollection, member: [source, destination], totalItems: 2 }),
    );
    mockFacilityService.listChildren
      .mockReturnValueOnce(
        of({ ...childrenCollection, member: children.slice(0, 100), totalItems: 101 }),
      )
      .mockReturnValueOnce(obsoleteAppend)
      .mockReturnValueOnce(
        of({ ...childrenCollection, member: children.slice(1), totalItems: 100 }),
      );
    mockFacilityService.move.mockReturnValue(
      of({ ...children[0], parentFacilityId: destination.id }),
    );
    store.loadRoots('org-1');
    const sourceRequest = { organizationId: 'org-1', facilityId: source.id };
    store.loadChildren(sourceRequest);
    store.loadMoreChildren(sourceRequest);
    store.move({
      organizationId: 'org-1',
      facilityId: children[0].id,
      parentFacilityId: destination.id,
    });
    obsoleteAppend.next({ ...childrenCollection, member: [children[100]], totalItems: 101 });
    obsoleteAppend.complete();
    expect(store.childrenByParent()[source.id]).toEqual(children.slice(1));
    expect(store.childPagesByParent()[source.id]).toBe(1);
    expect(store.childTotalsByParent()[source.id]).toBe(100);
    expect(store.expandingParentIds()).not.toContain(source.id);
  });

  it('preserves changed roots after a failed move refresh and retries from page one', () => {
    const nested = { ...child, parentFacilityId: root.id };
    const moved = { ...nested, parentFacilityId: null };
    mockFacilityService.list
      .mockReturnValueOnce(of(rootsCollection))
      .mockReturnValueOnce(throwError(() => apiError(503, 'offline')))
      .mockReturnValueOnce(of({ ...rootsCollection, member: [root, moved, moved], totalItems: 2 }));
    mockFacilityService.listChildren
      .mockReturnValueOnce(of({ ...childrenCollection, member: [nested] }))
      .mockReturnValueOnce(of({ ...childrenCollection, member: [], totalItems: 0 }));
    mockFacilityService.move.mockReturnValue(of(moved));
    store.loadRoots('org-1');
    store.loadChildren({ organizationId: 'org-1', facilityId: root.id });
    store.move({ organizationId: 'org-1', facilityId: nested.id, parentFacilityId: null });
    expect(store.roots().map((item) => item.id)).toEqual([root.id, nested.id]);
    expect(store.rootsPage()).toBe(0);
    expect(store.rootsTotal()).toBe(2);
    expect(store.hasRootsError()).toBe(true);
    store.loadMoreRoots('org-1');
    expect(mockFacilityService.list).toHaveBeenLastCalledWith('org-1', {
      rootsOnly: true,
      page: 1,
      itemsPerPage: 100,
      includePath: true,
    });
    expect(store.roots().map((item) => item.id)).toEqual([root.id, nested.id]);
    expect(store.rootsPage()).toBe(1);
    expect(store.hasRootsError()).toBe(false);
  });

  it('filters every root page by customer and cancels old roots and children after customer changes', () => {
    const oldRoots = new Subject<HydraCollection<FacilityOutput>>();
    const oldChildren = new Subject<HydraCollection<FacilityOutput>>();
    mockFacilityService.list.mockReturnValueOnce(oldRoots);
    mockFacilityService.listChildren.mockReturnValueOnce(oldChildren);
    store.loadRoots('org-1', 'customer-first');
    store.loadChildren({ organizationId: 'org-1', facilityId: 'site-old' });
    expect(mockFacilityService.list).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ rootsOnly: true, params: { customerId: 'customer-first' } }),
    );
    store.loadRoots('org-1', 'customer-second');
    expect(oldRoots.observed).toBe(false);
    expect(oldChildren.observed).toBe(false);
    expect(store.childrenByParent()).toEqual({});
    expect(mockFacilityService.list).toHaveBeenLastCalledWith(
      'org-1',
      expect.objectContaining({ params: { customerId: 'customer-second' } }),
    );
  });
});
