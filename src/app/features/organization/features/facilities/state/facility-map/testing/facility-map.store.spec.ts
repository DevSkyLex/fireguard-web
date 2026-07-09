import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityMapStore } from '../facility-map.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

/**
 * Builds a minimal {@link FacilityOutput} carrying the given coordinates so the
 * partitioning computeds can be exercised without a full fixture.
 */
function facilityWith(
  id: string,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): FacilityOutput {
  return { id, name: id, type: 'site', latitude, longitude } as unknown as FacilityOutput;
}

describe('FacilityMapStore', () => {
  let store: FacilityMapStore;
  let mockFacilityService: { listAll: ReturnType<typeof vi.fn> };

  const located = facilityWith('located', 48.8566, 2.3522);
  const originValid = facilityWith('origin', 0, 0);
  const missingLng = facilityWith('missing-lng', 48.85, null);
  const missingLat = facilityWith('missing-lat', null, 2.35);
  const bothNull = facilityWith('both-null', null, null);
  const undefinedCoords = facilityWith('undefined', undefined, undefined);

  const allFacilities: readonly FacilityOutput[] = [
    located,
    originValid,
    missingLng,
    missingLat,
    bothNull,
    undefinedCoords,
  ];

  beforeEach(() => {
    mockFacilityService = { listAll: vi.fn().mockReturnValue(of(allFacilities)) };

    TestBed.configureTestingModule({
      providers: [FacilityMapStore, { provide: FacilityService, useValue: mockFacilityService }],
    });

    store = TestBed.inject(FacilityMapStore);
  });

  it('should start idle with no facilities', () => {
    expect(store.facilities()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.mappable()).toEqual([]);
    expect(store.unlocated()).toEqual([]);
  });

  it('should load every facility for the organization', async () => {
    store.load('org-1');
    await flushEffects();

    expect(mockFacilityService.listAll).toHaveBeenCalledWith('org-1');
    expect(store.facilities()).toEqual(allFacilities);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('should treat a facility as mappable only when both coordinates are numbers', async () => {
    store.load('org-1');
    await flushEffects();

    // Note: (0, 0) is a valid position — the guard tests the type, not truthiness.
    expect(store.mappable()).toEqual([located, originValid]);
  });

  it('should surface facilities missing either coordinate as unlocated', async () => {
    store.load('org-1');
    await flushEffects();

    expect(store.unlocated()).toEqual([missingLng, missingLat, bothNull, undefinedCoords]);
  });

  it('should expose the normalized error and keep prior facilities on failure', async () => {
    mockFacilityService.listAll.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.load('org-1');
    await flushEffects();

    expect(store.error()).not.toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(store.facilities()).toEqual([]);
    expect(store.mappable()).toEqual([]);
  });
});
