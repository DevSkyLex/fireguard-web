import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, type ActivatedRouteSnapshot } from '@angular/router';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ActiveFacilityStore } from '@features/organization/features/facilities/state';
import { facilityTitleResolver } from '../facility-title.resolver';

function routeFor(facilityId: string): ActivatedRouteSnapshot {
  return { paramMap: convertToParamMap({ facilityId }) } as ActivatedRouteSnapshot;
}

describe('facilityTitleResolver', () => {
  const facility = { id: 'fac-1', name: 'HQ' } as unknown as FacilityOutput;

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

  it('should return the facility name synchronously when the selected facility matches the route', () => {
    const result = TestBed.runInInjectionContext(() =>
      facilityTitleResolver(routeFor('fac-1'), {} as never),
    );

    expect(result).toBe('HQ');
  });

  it('should fall back to the neutral section label while the facility is still loading', () => {
    selectedFacility.set(null);

    const result = TestBed.runInInjectionContext(() =>
      facilityTitleResolver(routeFor('fac-1'), {} as never),
    );

    expect(result).toBe('Facility');
  });

  it('should not title the route with a different facility left from a previous visit', () => {
    const result = TestBed.runInInjectionContext(() =>
      facilityTitleResolver(routeFor('fac-2'), {} as never),
    );

    expect(result).toBe('Facility');
  });
});
