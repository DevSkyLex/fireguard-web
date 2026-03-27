import { TestBed } from '@angular/core/testing';
import type { OrganizationMembershipStatisticsOutput } from '@core/models/organization';
import { OrganizationOverviewTeamOverviewChartComponent } from './organization-overview-team-overview-chart.component';

const MOCK_MEMBERSHIP_STATS: OrganizationMembershipStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/membership',
  '@type': 'OrganizationMembershipStatistics',
  activeMemberCount: 10,
  inactiveMemberCount: 2,
  roleCount: 4,
  acceptedInvitationCount: 5,
  pendingInvitationCount: 3,
  expiredInvitationCount: 1,
} as OrganizationMembershipStatisticsOutput;

describe('OrganizationOverviewTeamOverviewChartComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationOverviewTeamOverviewChartComponent],
    }).overrideComponent(OrganizationOverviewTeamOverviewChartComponent, {
      set: {
        template: '<div></div>',
      },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewTeamOverviewChartComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should derive the bar chart dataset from membership statistics', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewTeamOverviewChartComponent);
    fixture.componentRef.setInput('statistics', MOCK_MEMBERSHIP_STATS);
    fixture.detectChanges();

    const chartData = fixture.componentInstance['chartData']();

    expect(chartData.labels).toEqual([
      'Active',
      'Inactive',
      'Roles',
      'Accepted',
      'Pending',
      'Expired',
    ]);
    expect(chartData.datasets[0].data).toEqual([10, 2, 4, 5, 3, 1]);
    expect(chartData.datasets[0].borderRadius).toBe(8);
    expect(fixture.componentInstance['chartOptions'].responsive).toBe(true);
  });
});
