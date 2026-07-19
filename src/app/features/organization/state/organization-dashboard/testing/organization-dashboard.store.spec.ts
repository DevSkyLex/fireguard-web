import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { DashboardStore } from '../organization-dashboard.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('DashboardStore', () => {
  let store: DashboardStore;
  let mockOrganizationService: {
    getDashboard: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const recentIntervention = {
    id: 'int-1',
    number: 2048,
    name: 'Contrôle annuel extincteurs',
    status: 'in_progress',
    priority: 'high',
    siteId: 'fac-1',
    siteName: 'Siège — Paris 12e',
    responsibleId: 'member-1',
    responsibleName: 'Claire Lefèvre',
    responsibleAvatarUrl: null,
    dueAt: '2026-07-18T00:00:00+00:00',
    updatedAt: '2026-07-15T09:30:00+00:00',
  };
  const dashboard = {
    overview: {
      facilities: { summary: [{ value: 4 }] },
      members: { summary: [{ value: 12 }] },
      equipment: { summary: [{ value: 18 }] },
      inspections: { summary: [{ value: 7 }] },
    },
    comparison: {
      metrics: [{ key: 'facilities', value: 2, direction: 'up' }],
    },
    trends: {
      facilities: [
        { bucket: '2026-07-13', value: 2 },
        { bucket: '2026-07-14', value: 3 },
        { bucket: '2026-07-15', value: 4 },
      ],
      members: [
        { bucket: '2026-07-13', value: 12 },
        { bucket: '2026-07-14', value: 12 },
      ],
      equipment: [],
    },
    recentInterventions: [recentIntervention],
  } as unknown as OrganizationDashboardOutput;

  beforeEach(() => {
    mockOrganizationService = {
      getDashboard: vi.fn().mockReturnValue(of(dashboard)),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(DashboardStore);
  });

  it('should auto-load dashboard data for the active organization', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboard).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    );
    expect(store.queryData()).toEqual(dashboard);
    expect(store.facilityCount()).toBe(4);
    expect(store.membersComparison()).toBeNull();
    expect(store.facilitiesComparison()).toEqual({ value: 2, direction: 'up' });
  });

  it('should map embedded trend series to numeric sparkline points', async () => {
    await flushEffects();

    expect(store.facilitiesSparkline()).toEqual([2, 3, 4]);
    expect(store.membersSparkline()).toEqual([12, 12]);
  });

  it('should expose null sparklines for empty or missing series', async () => {
    await flushEffects();

    expect(store.equipmentSparkline()).toBeNull();
    expect(store.inspectionsSparkline()).toBeNull();
  });

  it('should expose the embedded recent interventions', async () => {
    await flushEffects();

    expect(store.recentInterventions()).toEqual([recentIntervention]);
  });
});
