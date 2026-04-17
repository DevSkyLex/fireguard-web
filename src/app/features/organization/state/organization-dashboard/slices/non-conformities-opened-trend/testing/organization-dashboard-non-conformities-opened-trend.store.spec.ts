import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { NonConformitiesOpenedTrendStore } from '../organization-dashboard-non-conformities-opened-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('NonConformitiesOpenedTrendStore', () => {
  let store: NonConformitiesOpenedTrendStore;
  let mockOrganizationService: {
    getDashboardNonConformitiesOpenedTrend: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const trend = {
    '@id': '/api/organizations/org-1/dashboard/trends/nc-opened',
    '@type': 'OrganizationDashboardTrend',
    metric: 'nonConformitiesOpened',
    generatedAt: '2026-04-08T10:00:00Z',
    period: { granularity: 'week', from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
    summary: { total: 5 },
    series: [{ bucket: '2026-03-10', value: 5 }],
    comparison: { series: [{ bucket: '2026-02-10', value: 2 }] },
  } as OrganizationDashboardTrendOutput;

  beforeEach(() => {
    localStorage.clear();
    mockOrganizationService = {
      getDashboardNonConformitiesOpenedTrend: vi.fn().mockReturnValue(of(trend)),
    };

    TestBed.configureTestingModule({
      providers: [
        NonConformitiesOpenedTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(NonConformitiesOpenedTrendStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should auto-load the opened non-conformities trend', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboardNonConformitiesOpenedTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ granularity: 'week', compare: true }),
    );
    expect(store.queryData()).toEqual(trend);
  });

  it('should reload when the severity filter changes', async () => {
    await flushEffects();

    store.setNonConformitySeverity('critical');
    await flushEffects();

    expect(mockOrganizationService.getDashboardNonConformitiesOpenedTrend).toHaveBeenLastCalledWith(
      'org-1',
      expect.objectContaining({ nonConformitySeverity: 'critical' }),
    );
  });
});
