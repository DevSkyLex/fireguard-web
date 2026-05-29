import { TestBed } from '@angular/core/testing';
import {
  RedirectCommand,
  type ActivatedRouteSnapshot,
  type MaybeAsync,
  Router,
} from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ActiveFacilityStore } from '@features/organization/features/facilities/state';
import { facilityResolver } from '../facility.resolver';

describe('facilityResolver', () => {
  const parsedRootUrl = { root: true } as const;
  const parsedOrganizationUrl = { organization: true } as const;
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

  let mockRouter: {
    parseUrl: ReturnType<typeof vi.fn>;
  };
  let mockActiveFacilityStore: {
    resolveFacility: ReturnType<typeof vi.fn>;
  };

  async function resolveMaybeAsync<T>(result: MaybeAsync<T>): Promise<T> {
    if (result instanceof Promise) {
      return result;
    }

    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    return result;
  }

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

  beforeEach(() => {
    mockRouter = {
      parseUrl: vi.fn((url: string) => (url === '/' ? parsedRootUrl : parsedOrganizationUrl)),
    };

    mockActiveFacilityStore = {
      resolveFacility: vi.fn().mockReturnValue(of(facility)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should resolve the facility when route parameters are present', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      resolveMaybeAsync(facilityResolver(createRoute('org-1', 'fac-1'), {} as never)),
    );

    expect(result).toEqual(facility);
    expect(mockActiveFacilityStore.resolveFacility).toHaveBeenCalledWith('org-1', 'fac-1');
  });

  it('should redirect to / when a required route parameter is missing', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      resolveMaybeAsync(facilityResolver(createRoute('org-1', null), {} as never)),
    );

    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).redirectTo).toBe(parsedRootUrl);
    expect(mockActiveFacilityStore.resolveFacility).not.toHaveBeenCalled();
  });

  it('should redirect to the organization page when facility resolution fails', async () => {
    mockActiveFacilityStore.resolveFacility.mockReturnValue(
      throwError(() => new Error('Not found')),
    );

    const result = await TestBed.runInInjectionContext(() =>
      resolveMaybeAsync(facilityResolver(createRoute('org-1', 'fac-1'), {} as never)),
    );

    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).redirectTo).toBe(parsedOrganizationUrl);
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/organizations/org-1');
  });
});
