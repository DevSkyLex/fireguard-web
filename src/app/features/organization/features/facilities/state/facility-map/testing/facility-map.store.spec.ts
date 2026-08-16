import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import {
  ComplianceTreeService,
  FacilityService,
} from '@features/organization/features/facilities/data-access';
import type {
  ComplianceTreeNodeOutput,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import { FacilityMapStore } from '../facility-map.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

const complianceNode = (
  overrides: Partial<ComplianceTreeNodeOutput> = {},
): ComplianceTreeNodeOutput => ({
  '@id': '/api/facilities/facility-1',
  '@type': 'Facility',
  id: 'facility-1',
  name: 'HQ',
  type: 'site',
  parentFacilityId: null,
  equipmentCount: 4,
  status: 'active',
  complianceRate: 92,
  children: [],
  ...overrides,
});

describe('FacilityMapStore', () => {
  let store: FacilityMapStore;
  let dispatch: ReturnType<typeof vi.fn>;
  let mockFacilityService: {
    listAll: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  let mockComplianceTreeService: {
    getTree: ReturnType<typeof vi.fn>;
  };

  const facilities = [
    { id: 'facility-1', name: 'HQ', latitude: 48.85, longitude: 2.35 },
    { id: 'facility-2', name: 'Depot', latitude: 45.75, longitude: 4.85 },
  ] as unknown as readonly FacilityOutput[];

  beforeEach(() => {
    dispatch = vi.fn();
    mockFacilityService = {
      listAll: vi.fn().mockReturnValue(of(facilities)),
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 3, view: undefined })),
    };
    mockComplianceTreeService = {
      getTree: vi.fn().mockReturnValue(
        of({
          '@id': '/api/collection',
          '@type': 'Collection',
          member: [complianceNode()],
          totalItems: 1,
        }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        FacilityMapStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: FacilityService, useValue: mockFacilityService },
        { provide: ComplianceTreeService, useValue: mockComplianceTreeService },
      ],
    });

    store = TestBed.inject(FacilityMapStore);
  });

  it('loads the located facilities', async () => {
    store.loadMapped({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockFacilityService.listAll).toHaveBeenCalledWith('org-1', { hasCoordinates: true });
    expect(store.mappedFacilities()).toEqual(facilities);
    expect(store.isLoadingMapped()).toBe(false);
  });

  it('records the failure and dispatches mappedFailed when loading fails', async () => {
    mockFacilityService.listAll.mockReturnValue(throwError(() => new Error('down')));

    store.loadMapped({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.hasMappedError()).toBe(true);
    expect(store.mappedFacilities()).toEqual([]);
    expect(dispatch).toHaveBeenCalled();
  });

  it('loads the unplaced facility count from a single-item page', async () => {
    store.loadUnplacedCount({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockFacilityService.list).toHaveBeenCalledWith('org-1', {
      hasCoordinates: false,
      itemsPerPage: 1,
    });
    expect(store.unplacedCount()).toBe(3);
  });

  it('dispatches unplacedFailed when the count request fails', async () => {
    mockFacilityService.list.mockReturnValue(throwError(() => new Error('down')));

    store.loadUnplacedCount({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.unplacedCount()).toBe(0);
    expect(dispatch).toHaveBeenCalled();
  });

  it('starts with the compliance layer off and never requested', () => {
    expect(store.complianceVisible()).toBe(false);
    expect(store.hasLoadedCompliance()).toBe(false);
  });

  it('flips the compliance visibility flag without fetching anything', () => {
    store.setComplianceVisible(true);

    expect(store.complianceVisible()).toBe(true);
    expect(mockComplianceTreeService.getTree).not.toHaveBeenCalled();
  });

  it('loads and flattens the compliance tree, joining it onto the located facilities', async () => {
    store.loadMapped({ organizationId: 'org-1' });
    store.loadCompliance({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockComplianceTreeService.getTree).toHaveBeenCalledWith('org-1');
    expect(store.complianceMap().get('facility-1')).toBe(92);
    expect(store.hasLoadedCompliance()).toBe(true);
    expect(store.isLoadingCompliance()).toBe(false);
  });

  it('dispatches complianceFailed when loading the compliance tree fails', async () => {
    mockComplianceTreeService.getTree.mockReturnValue(throwError(() => new Error('down')));

    store.loadCompliance({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.hasComplianceError()).toBe(true);
    expect(dispatch).toHaveBeenCalled();
  });

  it('ranks only facilities with a known compliance rate, lowest first, capped to five', async () => {
    mockComplianceTreeService.getTree.mockReturnValue(
      of({
        '@id': '/api/collection',
        '@type': 'Collection',
        member: [
          complianceNode({ id: 'facility-1', complianceRate: 30 }),
          complianceNode({ id: 'facility-2', complianceRate: 10 }),
        ],
        totalItems: 2,
      }),
    );

    store.loadMapped({ organizationId: 'org-1' });
    store.loadCompliance({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.worstFacilities()).toEqual([
      { facility: facilities[1], complianceRate: 10 },
      { facility: facilities[0], complianceRate: 30 },
    ]);
  });
});
