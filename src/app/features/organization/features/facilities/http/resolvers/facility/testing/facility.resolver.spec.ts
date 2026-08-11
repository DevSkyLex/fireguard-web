import { TestBed } from '@angular/core/testing';
import { RedirectCommand, type ActivatedRouteSnapshot, Router } from '@angular/router';
import { ActiveFacilityStore } from '@features/organization/features/facilities/state';
import { facilityResolver } from '../facility.resolver';

function createRoute(
  organizationId: string | null,
  facilityId: string | null,
): ActivatedRouteSnapshot {
  return {
    parent: {
      paramMap: {
        get: (key: string): string | null => (key === 'organizationId' ? organizationId : null),
      },
    },
    paramMap: {
      get: (key: string): string | null => (key === 'facilityId' ? facilityId : null),
    },
  } as unknown as ActivatedRouteSnapshot;
}

describe('facilityResolver', () => {
  const parsedRootUrl = { root: true } as const;

  let mockRouter: {
    parseUrl: ReturnType<typeof vi.fn>;
  };
  let mockActiveFacilityStore: {
    resolveFacility: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRouter = {
      parseUrl: vi.fn(() => parsedRootUrl),
    };

    mockActiveFacilityStore = {
      resolveFacility: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should seed the store and let activation proceed without waiting on the fetch', () => {
    const result = TestBed.runInInjectionContext(() =>
      facilityResolver(createRoute('org-1', 'fac-1'), {} as never),
    );

    expect(result).toBe(true);
    expect(mockActiveFacilityStore.resolveFacility).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'fac-1',
    });
  });

  it('should redirect to / when a required route parameter is missing', () => {
    const result = TestBed.runInInjectionContext(() =>
      facilityResolver(createRoute('org-1', null), {} as never),
    );

    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).redirectTo).toBe(parsedRootUrl);
    expect(mockActiveFacilityStore.resolveFacility).not.toHaveBeenCalled();
  });
});
