import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationDashboardAssetGrowthStore } from '../organization-dashboard-asset-growth.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('OrganizationDashboardAssetGrowthStore', () => {
  let store: OrganizationDashboardAssetGrowthStore;
  let mockOrganizationService: {
    getDashboardEquipmentCreatedTrend: ReturnType<typeof vi.fn>;
    getDashboardFacilitiesCreatedTrend: ReturnType<typeof vi.fn>;
  };

  const organization: OrganizationOutput = {
    '@id': '/api/organizations/org-1',
    '@type': 'Organization',
    id: 'org-1',
    name: 'Fireguard',
    slug: 'fireguard',
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    status: 'active',
    isActive: true,
    memberCount: 3,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  };

  const equipmentTrend: OrganizationDashboardTrendOutput = {
    '@id': '/api/organizations/org-1/dashboard/trends/equipment-created',
    '@type': 'OrganizationDashboardTrend',
    generatedAt: '2026-04-08T10:00:00Z',
    metric: 'equipmentCreated',
    period: {
      granularity: 'week',
      from: '2026-03-01T00:00:00Z',
      to: '2026-04-01T00:00:00Z',
    },
    summary: { total: 8 },
    series: [
      { bucket: '2026-03-10', value: 5 },
      { bucket: '2026-03-17', value: 3 },
    ],
    comparison: {
      series: [{ bucket: '2026-02-17', value: 3 }],
    },
  };

  const facilityTrend: OrganizationDashboardTrendOutput = {
    '@id': '/api/organizations/org-1/dashboard/trends/facilities-created',
    '@type': 'OrganizationDashboardTrend',
    generatedAt: '2026-04-08T10:00:00Z',
    metric: 'facilitiesCreated',
    period: {
      granularity: 'week',
      from: '2026-03-01T00:00:00Z',
      to: '2026-04-01T00:00:00Z',
    },
    summary: { total: 3 },
    series: [{ bucket: '2026-03-17', value: 3 }],
    comparison: {
      series: [{ bucket: '2026-02-17', value: 1 }],
    },
  };

  beforeEach(() => {
    mockOrganizationService = {
      getDashboardEquipmentCreatedTrend: vi.fn().mockReturnValue(of(equipmentTrend)),
      getDashboardFacilitiesCreatedTrend: vi.fn().mockReturnValue(of(facilityTrend)),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationDashboardAssetGrowthStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(OrganizationDashboardAssetGrowthStore);
  });

  it('should load both trend resources and expose summary metrics and chart data', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboardEquipmentCreatedTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        granularity: 'week',
        compare: true,
      }),
    );
    expect(mockOrganizationService.getDashboardFacilitiesCreatedTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        granularity: 'week',
        compare: true,
      }),
    );

    expect(store.queryData()).toEqual({
      equipment: equipmentTrend,
      facilities: facilityTrend,
    });
  });

  it('should clamp date ranges beyond the allowed daily window', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const tooFar = new Date('2026-05-01T00:00:00Z');

    store.setGranularity('day');
    store.setDateRange([from, tooFar]);

    const range = store.selectedDateRange();

    expect(range).not.toBeNull();
    expect(range?.[0].toISOString()).toBe(from.toISOString());
    expect(range?.[1].getTime()).toBe(from.getTime() + 90 * 24 * 60 * 60 * 1000);
  });

  it('should reload with compare disabled when compare mode changes', async () => {
    await flushEffects();

    store.setCompareEnabled(false);
    await flushEffects();

    expect(store.compareEnabled()).toBe(false);
    expect(mockOrganizationService.getDashboardEquipmentCreatedTrend).toHaveBeenLastCalledWith(
      'org-1',
      expect.objectContaining({
        granularity: 'week',
        compare: undefined,
      }),
    );
    expect(mockOrganizationService.getDashboardFacilitiesCreatedTrend).toHaveBeenLastCalledWith(
      'org-1',
      expect.objectContaining({
        granularity: 'week',
        compare: undefined,
      }),
    );
  });
});
