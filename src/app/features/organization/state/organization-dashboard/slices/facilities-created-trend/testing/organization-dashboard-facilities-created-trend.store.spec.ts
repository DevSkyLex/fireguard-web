import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { FacilitiesCreatedTrendStore } from '../organization-dashboard-facilities-created-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('FacilitiesCreatedTrendStore', () => {
  let store: FacilitiesCreatedTrendStore;
  let mockOrganizationService: {
    getDashboardFacilitiesCreatedTrend: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const trend = {
    '@id': '/api/organizations/org-1/dashboard/trends/facilities-created',
    '@type': 'OrganizationDashboardTrend',
    metric: 'facilitiesCreated',
    generatedAt: '2026-04-08T10:00:00Z',
    period: { granularity: 'week', from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
    summary: { total: 3 },
    series: [{ bucket: '2026-03-10', value: 3 }],
    comparison: { series: [{ bucket: '2026-02-10', value: 1 }] },
  } as OrganizationDashboardTrendOutput;

  beforeEach(() => {
    localStorage.clear();
    mockOrganizationService = {
      getDashboardFacilitiesCreatedTrend: vi.fn().mockReturnValue(of(trend)),
    };

    TestBed.configureTestingModule({
      providers: [
        FacilitiesCreatedTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(FacilitiesCreatedTrendStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should auto-load the trend for the active organization', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboardFacilitiesCreatedTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ granularity: 'week', compare: true }),
    );
    expect(store.queryData()).toEqual(trend);
  });

  it('should reload when the facility type filter changes', async () => {
    await flushEffects();

    store.setFacilityType('site');
    await flushEffects();

    expect(mockOrganizationService.getDashboardFacilitiesCreatedTrend).toHaveBeenLastCalledWith(
      'org-1',
      expect.objectContaining({ facilityType: 'site' }),
    );
  });
});
