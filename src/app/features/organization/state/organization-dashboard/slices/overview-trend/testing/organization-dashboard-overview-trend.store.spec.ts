import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OverviewTrendStore } from '../organization-dashboard-overview-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('OverviewTrendStore', () => {
  let store: OverviewTrendStore;
  let mockOrganizationService: {
    getDashboardInspectionsTrend: ReturnType<typeof vi.fn>;
    getDashboardNonConformitiesOpenedTrend: ReturnType<typeof vi.fn>;
    getDashboardNonConformitiesResolvedTrend: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const inspectionsTrend = {
    '@id': '/api/organizations/org-1/dashboard/trends/inspections',
    '@type': 'OrganizationDashboardTrend',
    metric: 'inspections',
    generatedAt: '2026-04-08T10:00:00Z',
    period: { granularity: 'week', from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
    summary: { total: 10 },
    series: [{ bucket: '2026-03-10', value: 10 }],
    comparison: { series: [{ bucket: '2026-02-10', value: 8 }] },
  } as OrganizationDashboardTrendOutput;
  const ncOpenedTrend = {
    ...inspectionsTrend,
    '@id': '/api/organizations/org-1/dashboard/trends/nc-opened',
    metric: 'nonConformitiesOpened',
  } as OrganizationDashboardTrendOutput;
  const ncResolvedTrend = {
    ...inspectionsTrend,
    '@id': '/api/organizations/org-1/dashboard/trends/nc-resolved',
    metric: 'nonConformitiesResolved',
  } as OrganizationDashboardTrendOutput;

  beforeEach(() => {
    localStorage.clear();
    mockOrganizationService = {
      getDashboardInspectionsTrend: vi.fn().mockReturnValue(of(inspectionsTrend)),
      getDashboardNonConformitiesOpenedTrend: vi.fn().mockReturnValue(of(ncOpenedTrend)),
      getDashboardNonConformitiesResolvedTrend: vi.fn().mockReturnValue(of(ncResolvedTrend)),
    };

    TestBed.configureTestingModule({
      providers: [
        OverviewTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(OverviewTrendStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should auto-load the three overview trend resources', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboardInspectionsTrend).toHaveBeenCalledTimes(1);
    expect(mockOrganizationService.getDashboardNonConformitiesOpenedTrend).toHaveBeenCalledTimes(1);
    expect(mockOrganizationService.getDashboardNonConformitiesResolvedTrend).toHaveBeenCalledTimes(
      1,
    );
    expect(store.queryData()).toEqual({
      inspections: inspectionsTrend,
      ncOpened: ncOpenedTrend,
      ncResolved: ncResolvedTrend,
    });
  });
});
