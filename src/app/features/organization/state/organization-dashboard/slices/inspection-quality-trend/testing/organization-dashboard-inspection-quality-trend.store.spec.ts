import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { InspectionQualityTrendStore } from '../organization-dashboard-inspection-quality-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('InspectionQualityTrendStore', () => {
  let store: InspectionQualityTrendStore;
  let mockOrganizationService: {
    getDashboardInspectionsTrend: ReturnType<typeof vi.fn>;
    getDashboardNonConformitiesOpenedTrend: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const inspectionsTrend = {
    '@id': '/api/organizations/org-1/dashboard/trends/inspections',
    '@type': 'OrganizationDashboardTrend',
    metric: 'inspections',
    generatedAt: '2026-04-08T10:00:00Z',
    period: { granularity: 'week', from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
    summary: { total: 20 },
    series: [{ bucket: '2026-03-10', value: 10 }],
    comparison: { series: [{ bucket: '2026-02-10', value: 8 }] },
  } as OrganizationDashboardTrendOutput;
  const ncOpenedTrend = {
    '@id': '/api/organizations/org-1/dashboard/trends/nc-opened',
    '@type': 'OrganizationDashboardTrend',
    metric: 'nonConformitiesOpened',
    generatedAt: '2026-04-08T10:00:00Z',
    period: { granularity: 'week', from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
    summary: { total: 4 },
    series: [{ bucket: '2026-03-10', value: 4 }],
    comparison: { series: [{ bucket: '2026-02-10', value: 2 }] },
  } as OrganizationDashboardTrendOutput;

  beforeEach(() => {
    localStorage.clear();
    mockOrganizationService = {
      getDashboardInspectionsTrend: vi.fn().mockReturnValue(of(inspectionsTrend)),
      getDashboardNonConformitiesOpenedTrend: vi.fn().mockReturnValue(of(ncOpenedTrend)),
    };

    TestBed.configureTestingModule({
      providers: [
        InspectionQualityTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(InspectionQualityTrendStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should auto-load both trend resources', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboardInspectionsTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ granularity: 'week', compare: true }),
    );
    expect(mockOrganizationService.getDashboardNonConformitiesOpenedTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ granularity: 'week', compare: true }),
    );
    expect(store.queryData()).toEqual({ inspections: inspectionsTrend, ncOpened: ncOpenedTrend });
  });

  it('should reload when the severity filter changes', async () => {
    await flushEffects();

    store.setGranularity('month');
    await flushEffects();

    expect(mockOrganizationService.getDashboardNonConformitiesOpenedTrend).toHaveBeenLastCalledWith(
      'org-1',
      expect.objectContaining({ granularity: 'month' }),
    );
  });
});
