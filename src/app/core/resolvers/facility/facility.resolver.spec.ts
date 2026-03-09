import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RedirectCommand, Router, provideRouter } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { facilityResolver } from './facility.resolver';
import { ActiveFacilityStore } from '@core/stores/facility';
import type { FacilityOutput } from '@core/models/facility';

const MOCK_FACILITY: FacilityOutput = {
  '@id': '/api/facilities/fac-1',
  '@type': 'Facility',
  id: 'fac-1',
  organizationId: 'org-1',
  name: 'Main Site',
  type: 'site',
  status: 'active',
  code: null,
  address: null,
  parentFacilityId: null,
  metadata: {},
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as FacilityOutput;

describe('facilityResolver', () => {
  const mockActiveFacilityStore = {
    selectedFacility: signal<FacilityOutput | null>(null),
    isLoadingFacility: signal(false),
    resolveFacility: vi.fn(),
  };

  function buildRoute(facilityId: string | null, organizationId: string | null): ActivatedRouteSnapshot {
    const parent = {
      paramMap: { get: (_: string) => organizationId },
    } as unknown as ActivatedRouteSnapshot;

    return {
      paramMap: { get: (_: string) => facilityId },
      parent,
    } as unknown as ActivatedRouteSnapshot;
  }

  function runResolver(route: ActivatedRouteSnapshot) {
    return TestBed.runInInjectionContext(() => facilityResolver(route, {} as never));
  }

  beforeEach(() => {
    mockActiveFacilityStore.resolveFacility.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
      ],
    });
  });

  it('should redirect to "/" when organizationId is missing', () => {
    const route = buildRoute('fac-1', null);
    const result = runResolver(route);

    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).redirectTo.toString()).toBe('/');
  });

  it('should redirect to "/" when facilityId is missing', () => {
    const route = buildRoute(null, 'org-1');
    const result = runResolver(route);

    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).redirectTo.toString()).toBe('/');
  });

  it('should call resolveFacility with correct ids', () => {
    mockActiveFacilityStore.resolveFacility.mockReturnValue(of(MOCK_FACILITY));
    const route = buildRoute('fac-1', 'org-1');
    runResolver(route);

    expect(mockActiveFacilityStore.resolveFacility).toHaveBeenCalledWith('org-1', 'fac-1');
  });

  it('should return the resolved facility on success', async () => {
    mockActiveFacilityStore.resolveFacility.mockReturnValue(of(MOCK_FACILITY));
    const route = buildRoute('fac-1', 'org-1');
    const result = runResolver(route) as ReturnType<typeof of>;

    const value = await firstValueFrom(result);
    expect(value).toEqual(MOCK_FACILITY);
  });

  it('should redirect to organization page on resolution failure', async () => {
    mockActiveFacilityStore.resolveFacility.mockReturnValue(
      throwError(() => new Error('Not found')),
    );
    const route = buildRoute('fac-1', 'org-1');
    const router = TestBed.inject(Router);
    const result = runResolver(route) as ReturnType<typeof of>;

    const value = await firstValueFrom(result);
    expect(value).toBeInstanceOf(RedirectCommand);
    expect((value as RedirectCommand).redirectTo.toString())
      .toBe(router.parseUrl('/organizations/org-1').toString());
  });
});
