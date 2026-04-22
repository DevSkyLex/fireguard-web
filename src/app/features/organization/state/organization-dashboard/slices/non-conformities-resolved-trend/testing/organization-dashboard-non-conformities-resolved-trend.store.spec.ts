import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { NonConformitiesResolvedTrendStore } from '../organization-dashboard-non-conformities-resolved-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('NonConformitiesResolvedTrendStore', () => {
  let store: NonConformitiesResolvedTrendStore;
  let mockOrganizationService: {
    getDashboardNonConformitiesResolvedTrend: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const trend = {
    '@id': '/api/organizations/org-1/dashboard/trends/nc-resolved',
    '@type': 'OrganizationDashboardTrend',
    metric: 'nonConformitiesResolved',
    generatedAt: '2026-04-08T10:00:00Z',
    period: { granularity: 'week', from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
    summary: { total: 4 },
    series: [{ bucket: '2026-03-10', value: 4 }],
    comparison: { series: [{ bucket: '2026-02-10', value: 3 }] },
  } as OrganizationDashboardTrendOutput;

  beforeEach(() => {
    localStorage.clear();
    mockOrganizationService = {
      getDashboardNonConformitiesResolvedTrend: vi.fn().mockReturnValue(of(trend)),
    };

    TestBed.configureTestingModule({
      providers: [
        NonConformitiesResolvedTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(NonConformitiesResolvedTrendStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should auto-load the resolved non-conformities trend', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboardNonConformitiesResolvedTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ granularity: 'week', compare: true }),
    );
    expect(store.queryData()).toEqual(trend);
  });

  it('should reload when the status filter changes', async () => {
    await flushEffects();

    store.setGranularity('month');
    await flushEffects();

    expect(
      mockOrganizationService.getDashboardNonConformitiesResolvedTrend,
    ).toHaveBeenLastCalledWith('org-1', expect.objectContaining({ granularity: 'month' }));
  });
});
