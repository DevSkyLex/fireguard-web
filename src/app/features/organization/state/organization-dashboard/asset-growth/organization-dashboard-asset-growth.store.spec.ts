import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationDashboardAssetGrowthStore } from './organization-dashboard-asset-growth.store';

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
    store.summaryMetrics();
    store.chartData();
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

    expect(store.summaryMetrics()).toEqual([
      {
        label: 'Equipment Added',
        value: '8',
        icon: 'pi pi-shield',
        comparison: { value: '+5', direction: 'up' },
      },
      {
        label: 'Facilities Added',
        value: '3',
        icon: 'pi pi-building',
        comparison: { value: '+2', direction: 'up' },
      },
      {
        label: 'Combined Growth',
        value: '11',
        icon: 'pi pi-arrow-up-right',
        comparison: { value: '+7', direction: 'up' },
      },
      {
        label: 'Equipment / Facility',
        value: '2.7x',
        icon: 'pi pi-percentage',
        comparison: null,
      },
    ]);

    expect(store.chartData()).toEqual({
      labels: ['Mar 10 - Mar 16, 2026', 'Mar 17 - Mar 23, 2026'],
      datasets: [
        {
          label: 'Equipment Created',
          data: [5, 3],
          backgroundColor: '#8b5cf6',
          hoverBackgroundColor: '#7c3aed',
        },
        {
          label: 'Facilities Created',
          data: [0, 3],
          backgroundColor: '#14b8a6',
          hoverBackgroundColor: '#0d9488',
        },
        {
          label: 'Equipment Previous Period',
          data: [3],
          backgroundColor: '#c4b5fd',
          hoverBackgroundColor: '#a78bfa',
        },
        {
          label: 'Facilities Previous Period',
          data: [1],
          backgroundColor: '#99f6e4',
          hoverBackgroundColor: '#5eead4',
        },
      ],
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

  it('should hide comparisons when compare mode is disabled', async () => {
    store.summaryMetrics();
    store.chartData();
    await flushEffects();

    store.setCompareEnabled(false);

    expect(store.summaryMetrics()[0]?.comparison).toBeNull();
    expect(store.summaryMetrics()[1]?.comparison).toBeNull();
    expect(store.summaryMetrics()[2]?.comparison).toBeNull();
    expect(store.chartData().datasets).toHaveLength(2);
  });
});
