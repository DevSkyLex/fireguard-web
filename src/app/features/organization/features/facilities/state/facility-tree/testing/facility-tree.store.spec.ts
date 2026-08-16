import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityTreeStore, type FacilityTreeStoreType } from '../facility-tree.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('FacilityTreeStore', () => {
  let store: FacilityTreeStoreType;
  let mockFacilityService: {
    list: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
  };

  const child = { id: 'facility-2', name: 'Wing B' } as unknown as FacilityOutput;
  const childCollection: HydraCollection<FacilityOutput> = {
    '@id': '/api/organizations/org-1/facilities/facility-1/children',
    '@type': 'Collection',
    totalItems: 1,
    member: [child],
  };

  beforeEach(() => {
    mockFacilityService = {
      list: vi
        .fn()
        .mockReturnValue(of({ '@id': '', '@type': 'Collection', totalItems: 0, member: [] })),
      listChildren: vi.fn().mockReturnValue(of(childCollection)),
    };

    TestBed.configureTestingModule({
      providers: [FacilityTreeStore, { provide: FacilityService, useValue: mockFacilityService }],
    });

    store = TestBed.inject(FacilityTreeStore);
  });

  it('loads a branch on the first call', async () => {
    store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
    expect(store.hasLoadedChildren('facility-1')).toBe(true);
  });

  it('does not re-fetch an already-loaded branch', async () => {
    store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
  });

  it('does not issue a second request while the branch is already in flight', () => {
    mockFacilityService.listChildren.mockReturnValue(of(childCollection));

    store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-1' });
    store.ensureChildrenLoaded({ organizationId: 'org-1', facilityId: 'facility-1' });

    expect(mockFacilityService.listChildren).toHaveBeenCalledTimes(1);
  });
});
