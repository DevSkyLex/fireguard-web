import { computed, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access/services/organization-permission/organization-permission.service';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationPermissionName,
  OrganizationOutput,
} from '@features/organization/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { AssetGrowthTrendStore } from '../organization-dashboard-asset-growth-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('AssetGrowthTrendStore', () => {
  let store: AssetGrowthTrendStore;
  const permissionState = {
    canReadEquipment: signal(false),
    canReadFacilities: signal(false),
  };
  let mockOrganizationService: {
    getDashboardEquipmentCreatedTrend: ReturnType<typeof vi.fn>;
    getDashboardFacilitiesCreatedTrend: ReturnType<typeof vi.fn>;
  };
  let mockOrganizationPermissionService: {
    hasPermission: ReturnType<typeof vi.fn>;
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
  const selectedOrganization = signal<OrganizationOutput | null>(organization);
  const selectedOrganizationId = computed(() => selectedOrganization()?.id ?? null);

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
    selectedOrganization.set(organization);
    permissionState.canReadEquipment.set(false);
    permissionState.canReadFacilities.set(false);

    mockOrganizationService = {
      getDashboardEquipmentCreatedTrend: vi.fn().mockReturnValue(of(equipmentTrend)),
      getDashboardFacilitiesCreatedTrend: vi.fn().mockReturnValue(of(facilityTrend)),
    };

    mockOrganizationPermissionService = {
      hasPermission: vi.fn((permission: OrganizationPermissionName): boolean => {
        if (permission === ORGANIZATION_PERMISSION.EQUIPMENT_READ) {
          return permissionState.canReadEquipment();
        }

        if (permission === ORGANIZATION_PERMISSION.FACILITIES_READ) {
          return permissionState.canReadFacilities();
        }

        return false;
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        AssetGrowthTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: OrganizationPermissionService,
          useValue: mockOrganizationPermissionService,
        },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization, selectedOrganizationId },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(AssetGrowthTrendStore);
  });

  it('defers queries until analysis is activated and does not reload on reactivation', async () => {
    permissionState.canReadEquipment.set(true);
    await flushEffects();
    expect(mockOrganizationService.getDashboardEquipmentCreatedTrend).not.toHaveBeenCalled();
    store.activate();
    await flushEffects();
    store.activate();
    await flushEffects();
    expect(mockOrganizationService.getDashboardEquipmentCreatedTrend).toHaveBeenCalledTimes(1);
  });

  it('should load both trend resources and expose summary metrics and chart data', async () => {
    permissionState.canReadEquipment.set(true);
    permissionState.canReadFacilities.set(true);
    store.activate();
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

  it('should load only the permitted trend resource when a single dimension is visible', async () => {
    permissionState.canReadEquipment.set(true);
    store.activate();
    await flushEffects();

    expect(mockOrganizationService.getDashboardEquipmentCreatedTrend).toHaveBeenCalledTimes(1);
    expect(mockOrganizationService.getDashboardFacilitiesCreatedTrend).not.toHaveBeenCalled();
    expect(store.queryData()).toEqual({
      equipment: equipmentTrend,
      facilities: null,
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
    permissionState.canReadEquipment.set(true);
    permissionState.canReadFacilities.set(true);
    store.activate();
    await flushEffects();

    store.setCompareEnabled(false);
    store.activate();
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

  it('clears A growth data when B starts loading and does not restore it on B failure', async () => {
    permissionState.canReadEquipment.set(true);
    permissionState.canReadFacilities.set(true);
    store.activate();
    await flushEffects();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardEquipmentCreatedTrend.mockReturnValue(pending);

    selectedOrganization.set({ ...organization, id: 'org-2' });
    await flushEffects();

    expect(store.queryOrganizationId()).toBe('org-2');
    expect(store.queryData()).toBeNull();
    expect(store.isQueryLoading()).toBe(true);
    pending.error(new Error('Organization B unavailable'));
    expect(store.queryError()?.message).toBe('Organization B unavailable');
    expect(store.queryData()).toBeNull();
  });

  it('cancels both A trend requests during a switch and ignores their late results', async () => {
    permissionState.canReadEquipment.set(true);
    permissionState.canReadFacilities.set(true);
    store.activate();
    await flushEffects();
    const staleEquipment = new Subject<OrganizationDashboardTrendOutput>();
    const staleFacilities = new Subject<OrganizationDashboardTrendOutput>();
    const current = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardEquipmentCreatedTrend
      .mockReturnValueOnce(staleEquipment)
      .mockReturnValueOnce(current);
    mockOrganizationService.getDashboardFacilitiesCreatedTrend.mockReturnValueOnce(staleFacilities);
    store.load(store.loadParams());

    selectedOrganization.set({ ...organization, id: 'org-2' });
    await flushEffects();
    expect(staleEquipment.observed).toBe(false);
    expect(staleFacilities.observed).toBe(false);

    const trendB = { ...equipmentTrend, summary: { total: 42 } };
    current.next(trendB);
    current.complete();
    staleEquipment.next(equipmentTrend);
    staleEquipment.complete();
    staleFacilities.next(facilityTrend);
    staleFacilities.complete();

    expect(store.queryData()?.equipment).toEqual(trendB);
    expect(store.queryOrganizationId()).toBe('org-2');
  });

  it.each(['success', 'error'] as const)(
    'ignores a stale %s before the organization-change effects run',
    async (outcome) => {
      permissionState.canReadEquipment.set(true);
      const pending = new Subject<OrganizationDashboardTrendOutput>();
      mockOrganizationService.getDashboardEquipmentCreatedTrend.mockReturnValue(pending);
      store.activate();
      await flushEffects();

      selectedOrganization.set({ ...organization, id: 'org-2' });
      if (outcome === 'success') {
        pending.next(equipmentTrend);
        pending.complete();
      } else pending.error(new Error('Stale failure'));

      expect(store.queryData()).toBeNull();
      expect(store.queryError()).toBeNull();
    },
  );

  it('cancels a pending retry and clears data when the organization disappears', async () => {
    permissionState.canReadEquipment.set(true);
    store.activate();
    await flushEffects();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardEquipmentCreatedTrend.mockReturnValue(pending);
    store.load(store.loadParams());

    selectedOrganization.set(null);
    await flushEffects();
    pending.next(equipmentTrend);
    pending.complete();

    expect(pending.observed).toBe(false);
    expect(store.queryOrganizationId()).toBeNull();
    expect(store.queryData()).toBeNull();
    expect(store.queryError()).toBeNull();
    expect(store.isQueryLoading()).toBe(false);
  });

  it('retains data during a same-organization period change and its recoverable failure', async () => {
    permissionState.canReadEquipment.set(true);
    store.activate();
    await flushEffects();
    const previous = store.queryData();
    const previousChart = store.alignedTrendData();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardEquipmentCreatedTrend.mockReturnValue(pending);

    store.setGranularity('month');
    await flushEffects();
    expect(store.isQueryLoading()).toBe(true);
    expect(store.queryData()).toEqual(previous);
    expect(store.alignedTrendData()).toEqual(previousChart);
    pending.error(new Error('Period unavailable'));
    expect(store.queryHasError()).toBe(true);
    expect(store.queryData()).toEqual(previous);
  });

  it('clears data on organization change even while an incomplete period prevents queries', async () => {
    permissionState.canReadEquipment.set(true);
    store.activate();
    await flushEffects();
    const previous = store.queryData();
    store.setDateRange([new Date('2026-04-01')]);
    await flushEffects();
    expect(store.loadParams()).toBeUndefined();
    expect(store.queryData()).toEqual(previous);

    selectedOrganization.set({ ...organization, id: 'org-2' });
    await flushEffects();
    expect(store.queryData()).toBeNull();
    expect(store.queryOrganizationId()).toBe('org-2');
  });

  it('ignores an obsolete manual retry without cancelling the current organization query', async () => {
    permissionState.canReadEquipment.set(true);
    store.activate();
    await flushEffects();
    const oldParams = store.loadParams();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardEquipmentCreatedTrend.mockReturnValue(pending);
    selectedOrganization.set({ ...organization, id: 'org-2' });
    await flushEffects();

    store.load(oldParams);

    expect(pending.observed).toBe(true);
    expect(mockOrganizationService.getDashboardEquipmentCreatedTrend).toHaveBeenCalledTimes(2);
    pending.next({ ...equipmentTrend, summary: { total: 42 } });
    pending.complete();
    expect(store.queryData()?.equipment?.summary?.['total']).toBe(42);
  });

  it('ends a cancelled period refresh without discarding its same-organization data', async () => {
    permissionState.canReadEquipment.set(true);
    store.activate();
    await flushEffects();
    const previous = store.queryData();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardEquipmentCreatedTrend.mockReturnValue(pending);
    store.load(store.loadParams());

    store.setDateRange([new Date('2026-04-01')]);
    await flushEffects();

    expect(pending.observed).toBe(false);
    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryData()).toEqual(previous);
  });
});
