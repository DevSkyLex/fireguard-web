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
  const dashboard = {
    overview: {
      equipment: {
        summary: [
          { key: 'total', value: 18 },
          { key: 'active', value: 15 },
          { key: 'maintenance', value: 2 },
          { key: 'out_of_service', value: 1 },
        ],
      },
      inspections: {
        summary: [
          { key: 'total', value: 7 },
          { key: 'pass', value: 5 },
          { key: 'partial', value: 1 },
          { key: 'fail', value: 1 },
        ],
      },
      nonConformities: {
        summary: [
          { key: 'open', value: 6 },
          { key: 'severityCritical', value: 2 },
          { key: 'severityHigh', value: 3 },
          { key: 'severityMedium', value: 1 },
          { key: 'severityLow', value: 0 },
        ],
      },
      interventions: {
        summary: [
          { key: 'open', value: 4 },
          { key: 'overdue', value: 2 },
        ],
      },
    },
    comparison: {},
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
  });

  it('should read the open and overdue intervention counts by key', async () => {
    await flushEffects();

    expect(store.openInterventionCount()).toBe(4);
    expect(store.overdueInterventionCount()).toBe(2);
  });

  it('should expose the severity breakdown worst first with zero-filled buckets', async () => {
    await flushEffects();

    expect(store.nonConformitiesBySeverity()).toEqual([
      { severity: 'critical', count: 2 },
      { severity: 'high', count: 3 },
      { severity: 'medium', count: 1 },
      { severity: 'low', count: 0 },
    ]);
  });

  it('should expose the equipment status and inspection result breakdowns', async () => {
    await flushEffects();

    expect(store.equipmentByStatus().length).toBeGreaterThan(0);
    expect(store.inspectionsByResult().length).toBeGreaterThan(0);
  });

  it('should read null intervention metrics when the section is absent', async () => {
    mockOrganizationService.getDashboard.mockReturnValue(
      of({ overview: {}, comparison: {} } as unknown as OrganizationDashboardOutput),
    );
    await flushEffects();

    expect(store.openInterventionCount()).toBeNull();
    expect(store.overdueInterventionCount()).toBeNull();
  });
});
