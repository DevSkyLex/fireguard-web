import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityMapStore } from '../facility-map.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('FacilityMapStore', () => {
  let store: FacilityMapStore;
  let dispatch: ReturnType<typeof vi.fn>;
  let mockFacilityService: {
    listAll: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };

  const facilities = [
    { id: 'facility-1', name: 'HQ', latitude: 48.85, longitude: 2.35 },
  ] as unknown as readonly FacilityOutput[];

  beforeEach(() => {
    dispatch = vi.fn();
    mockFacilityService = {
      listAll: vi.fn().mockReturnValue(of(facilities)),
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 3, view: undefined })),
    };

    TestBed.configureTestingModule({
      providers: [
        FacilityMapStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: FacilityService, useValue: mockFacilityService },
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
});
