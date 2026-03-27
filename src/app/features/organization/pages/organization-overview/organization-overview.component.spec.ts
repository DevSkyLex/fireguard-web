import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { OrganizationOverviewPage } from './organization-overview.component';
import { ActiveOrganizationStore } from '@core/stores/organization';
import type {
  OrganizationDashboardStatistics,
  OrganizationOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';

const MOCK_ORG: OrganizationOutput = {
  '@id': '/api/organizations/org-1',
  '@type': 'Organization',
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme',
  isActive: true,
  status: 'active',
  ownerUserId: 'u1',
  createdByUserId: 'u1',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as OrganizationOutput;

const MOCK_STATS: OrganizationStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics',
  '@type': 'OrganizationStatistics',
  memberCount: 12,
  roleCount: 3,
  facilityCount: 8,
  activeFacilityCount: 6,
  pendingInvitationCount: 2,
} as OrganizationStatisticsOutput;

const MOCK_DASHBOARD_STATS: OrganizationDashboardStatistics = {
  overview: MOCK_STATS,
  equipment: {
    '@id': '/api/organizations/org-1/statistics/equipment',
    '@type': 'OrganizationEquipmentStatistics',
    totalCount: 14,
    inStockCount: 2,
    operationalCount: 9,
    underMaintenanceCount: 2,
    decommissionedCount: 1,
    countsByType: {
      fire_extinguisher: 8,
      smoke_detector: 4,
      hydrant: 2,
    },
  },
  facilities: {
    '@id': '/api/organizations/org-1/statistics/facilities',
    '@type': 'OrganizationFacilityStatistics',
    totalCount: 8,
    activeCount: 6,
    archivedCount: 2,
    countsByType: {
      site: 1,
      building: 3,
      floor: 2,
      area: 2,
    },
  },
  inspections: {
    '@id': '/api/organizations/org-1/statistics/inspections',
    '@type': 'OrganizationInspectionStatistics',
    totalCount: 19,
    draftCount: 2,
    submittedCount: 5,
    closedCount: 12,
    passCount: 11,
    failCount: 5,
    partialCount: 3,
    countsByInspectorType: {
      user: 15,
      external: 4,
    },
    performedLast7DaysCount: 4,
    performedLast30DaysCount: 9,
  },
  membership: {
    '@id': '/api/organizations/org-1/statistics/membership',
    '@type': 'OrganizationMembershipStatistics',
    memberCount: 12,
    activeMemberCount: 10,
    inactiveMemberCount: 2,
    roleCount: 3,
    systemRoleCount: 2,
    customRoleCount: 1,
    invitationCount: 6,
    pendingInvitationCount: 2,
    acceptedInvitationCount: 3,
    revokedInvitationCount: 1,
    expiredInvitationCount: 0,
  },
  nonConformities: {
    '@id': '/api/organizations/org-1/statistics/non-conformities',
    '@type': 'OrganizationNonConformityStatistics',
    totalCount: 10,
    openCount: 4,
    inProgressCount: 2,
    doneCount: 3,
    waivedCount: 1,
    lowSeverityCount: 3,
    mediumSeverityCount: 4,
    highSeverityCount: 2,
    criticalSeverityCount: 1,
  },
};

describe('OrganizationOverviewPage', () => {
  const mockOrganizationStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
    statistics: signal<OrganizationStatisticsOutput | null>(null),
    dashboardStatistics: signal<OrganizationDashboardStatistics | null>(null),
    isLoadingStatistics: signal(false),
    statisticsError: signal<{ message: string } | null>(null),
    loadStatistics: vi.fn(),
  };

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    mockOrganizationStore.statistics.set(null);
    mockOrganizationStore.dashboardStatistics.set(null);
    mockOrganizationStore.isLoadingStatistics.set(false);
    mockOrganizationStore.statisticsError.set(null);
    mockOrganizationStore.loadStatistics.mockReset();

    TestBed.configureTestingModule({
      imports: [OrganizationOverviewPage],
      providers: [
        provideRouter([]),
        { provide: ActiveOrganizationStore, useValue: mockOrganizationStore },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load statistics when organization is available', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    expect(mockOrganizationStore.loadStatistics).toHaveBeenCalledWith('org-1');
  });

  it('should not reload statistics when current organization dashboard is already available', () => {
    mockOrganizationStore.statistics.set(MOCK_STATS);
    mockOrganizationStore.dashboardStatistics.set(MOCK_DASHBOARD_STATS);

    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();

    expect(mockOrganizationStore.loadStatistics).not.toHaveBeenCalled();
  });

  it('should display organization name', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
  });

  it('should show skeleton cards when loading', () => {
    mockOrganizationStore.isLoadingStatistics.set(true);
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display dashboard stat values when statistics are loaded', () => {
    mockOrganizationStore.statistics.set(MOCK_STATS);
    mockOrganizationStore.dashboardStatistics.set(MOCK_DASHBOARD_STATS);
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('12');
    expect(fixture.nativeElement.textContent).toContain('14');
    expect(fixture.nativeElement.textContent).toContain('9');
    expect(fixture.nativeElement.textContent).toContain('6/8');
  });

  it('should display quick actions', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Open facilities');
    expect(fixture.nativeElement.textContent).toContain('Review equipments');
    expect(fixture.nativeElement.textContent).toContain('Track inspections');
  });

  it('should show Active tag when organization is active', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Active');
  });
});
