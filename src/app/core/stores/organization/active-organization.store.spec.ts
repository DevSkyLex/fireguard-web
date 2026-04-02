import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Dispatcher } from '@ngrx/signals/events';
import { OrganizationService } from '@core/services/api/organization';
import type {
  OrganizationDashboardOutput,
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@core/models/organization';
import { ActiveOrganizationStore } from './active-organization.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveOrganizationStore', () => {
  let store: ActiveOrganizationStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockOrganizationService: {
    get: ReturnType<typeof vi.fn>;
    getDashboard: ReturnType<typeof vi.fn>;
    getDashboardInspectionsTrend: ReturnType<typeof vi.fn>;
    getDashboardNonConformitiesOpenedTrend: ReturnType<typeof vi.fn>;
    getDashboardNonConformitiesResolvedTrend: ReturnType<typeof vi.fn>;
  };

  const organization: OrganizationOutput = {
    '@id': '/api/organizations/org-1',
    '@type': 'Organization',
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme',
    isActive: true,
    status: 'active',
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    memberCount: 4,
    createdAt: '2026-03-01T00:00:00+00:00',
    updatedAt: '2026-03-30T00:00:00+00:00',
  };

  const dashboard: OrganizationDashboardOutput = {
    '@id': '/api/organizations/org-1/dashboard',
    '@type': 'OrganizationDashboard',
    generatedAt: '2026-03-30T08:00:00+00:00',
    period: {
      from: '2026-03-01T00:00:00+00:00',
      to: '2026-03-30T23:59:59+00:00',
      timezone: 'UTC',
    },
    overview: {
      members: {
        summary: [
          { key: 'memberCount', label: 'Members', value: 4 },
        ],
      },
    },
    health: {
      metrics: [
        { key: 'readiness', label: 'Readiness', value: 88 },
      ],
    },
    alerts: [
      { code: 'inspections_overdue', severity: 'warning', count: 1 },
    ],
    comparison: {
      mode: 'previous_period',
      from: '2026-02-01T00:00:00+00:00',
      to: '2026-02-29T23:59:59+00:00',
      metrics: [
        { key: 'members', label: 'Members', value: '+1', direction: 'up' },
      ],
      health: {
        metrics: [
          { key: 'readiness', label: 'Readiness', value: 5, direction: 'up' },
        ],
      },
    },
  };

  const inspectionsTrend: OrganizationDashboardTrendOutput = {
    '@id': '/api/organizations/org-1/dashboard/trends/inspections',
    '@type': 'OrganizationDashboardTrend',
    generatedAt: '2026-03-30T08:00:00+00:00',
    metric: 'inspections',
    period: {
      ...dashboard.period,
      granularity: 'day',
    },
    summary: {
      total: 8,
    },
    series: [
      { date: '2026-03-29', value: 2 },
    ],
    comparison: {
      mode: 'previous_period',
      from: '2026-02-01T00:00:00+00:00',
      to: '2026-02-29T23:59:59+00:00',
      summary: [
        { key: 'delta', label: 'Delta', value: 1 },
      ],
      series: [
        { date: '2026-02-29', value: 1 },
      ],
    },
  };

  const openedTrend: OrganizationDashboardTrendOutput = {
    '@id': '/api/organizations/org-1/dashboard/trends/non-conformities-opened',
    '@type': 'OrganizationDashboardTrend',
    generatedAt: '2026-03-30T08:00:00+00:00',
    metric: 'nonConformitiesOpened',
    period: {
      ...dashboard.period,
      granularity: 'day',
    },
    summary: {
      total: 3,
    },
    series: [
      { date: '2026-03-29', value: 1 },
    ],
    comparison: {
      mode: 'previous_period',
      from: '2026-02-01T00:00:00+00:00',
      to: '2026-02-29T23:59:59+00:00',
      summary: [
        { key: 'delta', label: 'Delta', value: -1 },
      ],
      series: [
        { date: '2026-02-29', value: 1 },
      ],
    },
  };

  const resolvedTrend: OrganizationDashboardTrendOutput = {
    '@id': '/api/organizations/org-1/dashboard/trends/non-conformities-resolved',
    '@type': 'OrganizationDashboardTrend',
    generatedAt: '2026-03-30T08:00:00+00:00',
    metric: 'nonConformitiesResolved',
    period: {
      ...dashboard.period,
      granularity: 'day',
    },
    summary: {
      total: 5,
    },
    series: [
      { date: '2026-03-29', value: 2 },
    ],
    comparison: {
      mode: 'previous_period',
      from: '2026-02-01T00:00:00+00:00',
      to: '2026-02-29T23:59:59+00:00',
      summary: [
        { key: 'delta', label: 'Delta', value: 2 },
      ],
      series: [
        { date: '2026-02-29', value: 2 },
      ],
    },
  };

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockOrganizationService = {
      get: vi.fn(),
      getDashboard: vi.fn(),
      getDashboardInspectionsTrend: vi.fn(),
      getDashboardNonConformitiesOpenedTrend: vi.fn(),
      getDashboardNonConformitiesResolvedTrend: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: OrganizationService, useValue: mockOrganizationService },
      ],
    });

    store = TestBed.inject(ActiveOrganizationStore);
  });

  it('should load the dashboard for the selected organization', async () => {
    mockOrganizationService.getDashboard.mockReturnValue(of(dashboard));

    store.setOrganization(organization);
    store.ensureDashboardLoaded('org-1', {
      facilityType: 'site',
      inspectionStatus: 'closed',
    });
    await flushEffects();

    expect(mockOrganizationService.getDashboard).toHaveBeenCalledWith('org-1', {
      facilityType: 'site',
      inspectionStatus: 'closed',
    });
    expect(store.dashboard()).toEqual(dashboard);
    expect(store.dashboardOperation().status).toBe('success');
  });

  it('should load the dedicated dashboard trend endpoints', async () => {
    mockOrganizationService.getDashboardInspectionsTrend.mockReturnValue(of(inspectionsTrend));
    mockOrganizationService.getDashboardNonConformitiesOpenedTrend.mockReturnValue(of(openedTrend));
    mockOrganizationService.getDashboardNonConformitiesResolvedTrend.mockReturnValue(of(resolvedTrend));

    store.loadDashboardTrends('org-1', {
      granularity: 'week',
      timezone: 'UTC',
    });
    await flushEffects();

    expect(mockOrganizationService.getDashboardInspectionsTrend)
      .toHaveBeenCalledWith('org-1', { granularity: 'week', timezone: 'UTC' });
    expect(mockOrganizationService.getDashboardNonConformitiesOpenedTrend)
      .toHaveBeenCalledWith('org-1', { granularity: 'week', timezone: 'UTC' });
    expect(mockOrganizationService.getDashboardNonConformitiesResolvedTrend)
      .toHaveBeenCalledWith('org-1', { granularity: 'week', timezone: 'UTC' });
    expect(store.dashboardInspectionsTrend()).toEqual(inspectionsTrend);
    expect(store.dashboardNonConformitiesOpenedTrend()).toEqual(openedTrend);
    expect(store.dashboardNonConformitiesResolvedTrend()).toEqual(resolvedTrend);
    expect(store.isLoadingDashboardTrends()).toBe(false);
  });

  it('should reset dashboard data when switching to another organization', async () => {
    mockOrganizationService.getDashboard.mockReturnValue(of(dashboard));
    mockOrganizationService.getDashboardInspectionsTrend.mockReturnValue(of(inspectionsTrend));

    store.setOrganization(organization);
    store.ensureDashboardLoaded('org-1');
    store.loadDashboardInspectionsTrend({ organizationId: 'org-1' });
    await flushEffects();

    store.setOrganization({
      ...organization,
      '@id': '/api/organizations/org-2',
      id: 'org-2',
      slug: 'beta',
      name: 'Beta Corp',
    });

    expect(store.dashboard()).toBeNull();
    expect(store.dashboardInspectionsTrend()).toBeNull();
    expect(store.dashboardOperation().status).toBe('idle');
    expect(store.dashboardTrendOperations().inspections.status).toBe('idle');
  });

  it('should dispatch an event when a dashboard trend request fails', async () => {
    mockOrganizationService.getDashboardInspectionsTrend
      .mockReturnValue(throwError(() => new Error('boom')));

    store.loadDashboardInspectionsTrend({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.dashboardTrendOperations().inspections.status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });
});
