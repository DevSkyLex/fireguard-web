import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { EquipmentCreatedTrendStore } from '../organization-dashboard-equipment-created-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('EquipmentCreatedTrendStore', () => {
  let store: EquipmentCreatedTrendStore;
  let mockOrganizationService: {
    getDashboardEquipmentCreatedTrend: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const trend = {
    '@id': '/api/organizations/org-1/dashboard/trends/equipment-created',
    '@type': 'OrganizationDashboardTrend',
    metric: 'equipmentCreated',
    generatedAt: '2026-04-08T10:00:00Z',
    period: { granularity: 'week', from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
    summary: { total: 8 },
    series: [{ bucket: '2026-03-10', value: 5 }],
    comparison: { series: [{ bucket: '2026-02-10', value: 3 }] },
  } as OrganizationDashboardTrendOutput;

  beforeEach(() => {
    localStorage.clear();
    mockOrganizationService = {
      getDashboardEquipmentCreatedTrend: vi.fn().mockReturnValue(of(trend)),
    };

    TestBed.configureTestingModule({
      providers: [
        EquipmentCreatedTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(EquipmentCreatedTrendStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should auto-load the trend for the active organization', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboardEquipmentCreatedTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ granularity: 'week', compare: true }),
    );
    expect(store.queryData()).toEqual(trend);
  });

  it('should reload when the equipment type filter changes', async () => {
    await flushEffects();

    store.setGranularity('month');
    await flushEffects();

    expect(mockOrganizationService.getDashboardEquipmentCreatedTrend).toHaveBeenLastCalledWith(
      'org-1',
      expect.objectContaining({ granularity: 'month' }),
    );
  });
});
