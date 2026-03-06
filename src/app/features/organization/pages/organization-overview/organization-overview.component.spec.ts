import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { OrganizationOverviewPage } from './organization-overview.component';
import { ActiveOrganizationStore } from '@core/stores/organization';
import type { OrganizationOutput, OrganizationStatisticsOutput } from '@core/models/organization';

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
  pendingInvitationCount: 2,
} as OrganizationStatisticsOutput;

describe('OrganizationOverviewPage', () => {
  const mockOrganizationStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
    statistics: signal<OrganizationStatisticsOutput | null>(null),
    isLoadingStatistics: signal(false),
    loadStatistics: vi.fn(),
  };

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    mockOrganizationStore.statistics.set(null);
    mockOrganizationStore.isLoadingStatistics.set(false);
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

  it('should load statistics on init when organization is available', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    expect(mockOrganizationStore.loadStatistics).toHaveBeenCalledWith('org-1');
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

  it('should display stat values when statistics are loaded', () => {
    mockOrganizationStore.statistics.set(MOCK_STATS);
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('12');
    expect(fixture.nativeElement.textContent).toContain('3');
    expect(fixture.nativeElement.textContent).toContain('8');
    expect(fixture.nativeElement.textContent).toContain('2');
  });

  it('should display quick actions', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Invite members');
    expect(fixture.nativeElement.textContent).toContain('Manage roles');
    expect(fixture.nativeElement.textContent).toContain('Organization settings');
  });

  it('should show Active tag when organization is active', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewPage);
    fixture.detectChanges();
    const tag = fixture.debugElement.query(By.css('p-tag'));
    expect(tag).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Active');
  });
});
