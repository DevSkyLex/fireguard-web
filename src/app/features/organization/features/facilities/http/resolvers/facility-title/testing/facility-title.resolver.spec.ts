import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, isObservable, type Observable } from 'rxjs';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ActiveFacilityStore } from '@features/organization/features/facilities/state';
import { facilityTitleResolver } from '../facility-title.resolver';

describe('facilityTitleResolver', () => {
  const facility: FacilityOutput = {
    '@id': '/api/facilities/fac-1',
    '@type': 'Facility',
    id: 'fac-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'HQ',
    code: 'HQ',
    status: 'active',
    address: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
  };

  const selectedFacility = signal<FacilityOutput | null>(facility);

  beforeEach(() => {
    selectedFacility.set(facility);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActiveFacilityStore,
          useValue: {
            selectedFacility,
          },
        },
      ],
    });
  });

  it('should return the facility name synchronously when already selected', () => {
    const result = TestBed.runInInjectionContext(() =>
      facilityTitleResolver({} as never, {} as never),
    );

    expect(result).toBe('HQ');
  });

  it('should wait for the selected facility when not already available', async () => {
    selectedFacility.set(null);

    const result = TestBed.runInInjectionContext(() =>
      facilityTitleResolver({} as never, {} as never),
    );

    expect(isObservable(result)).toBe(true);

    const pendingResult = firstValueFrom(result as Observable<string>);
    selectedFacility.set(facility);

    await expect(pendingResult).resolves.toBe('HQ');
  });
});
