import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import type { ApiError, HydraCollection } from '@core/api/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
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
  };

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
    };

    TestBed.configureTestingModule({
      providers: [FacilityTreeStore, { provide: FacilityService, useValue: mockFacilityService }],
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
});
