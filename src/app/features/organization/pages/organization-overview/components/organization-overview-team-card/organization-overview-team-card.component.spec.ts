import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { OrganizationMembershipStatisticsOutput } from '@core/models/organization';
import { OrganizationOverviewTeamOverviewChartComponent } from '../organization-overview-team-overview-chart/organization-overview-team-overview-chart.component';
import { OrganizationOverviewTeamCardComponent } from './organization-overview-team-card.component';

@Component({
  selector: 'app-organization-overview-team-overview-chart',
  standalone: true,
  template: '',
})
class TestOrganizationOverviewTeamOverviewChartStubComponent {
  public readonly statistics =
    input<OrganizationMembershipStatisticsOutput | null>(null);
}

const MOCK_MEMBERSHIP_STATS: OrganizationMembershipStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/membership',
  '@type': 'OrganizationMembershipStatistics',
  memberCount: 12,
  activeMemberCount: 10,
  inactiveMemberCount: 2,
  roleCount: 4,
  customRoleCount: 1,
  pendingInvitationCount: 3,
} as OrganizationMembershipStatisticsOutput;

describe('OrganizationOverviewTeamCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationOverviewTeamCardComponent],
    }).overrideComponent(OrganizationOverviewTeamCardComponent, {
      remove: { imports: [OrganizationOverviewTeamOverviewChartComponent] },
      add: { imports: [TestOrganizationOverviewTeamOverviewChartStubComponent] },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewTeamCardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should derive summary items from membership statistics', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewTeamCardComponent);
    fixture.componentRef.setInput('statistics', MOCK_MEMBERSHIP_STATS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Members');
    expect(fixture.nativeElement.textContent).toContain('Roles');
    expect(fixture.nativeElement.textContent).toContain('Pending');
    expect(fixture.nativeElement.textContent).toContain('Custom roles');
    expect(fixture.nativeElement.textContent).toContain('12');
    expect(fixture.nativeElement.textContent).toContain('4');
    expect(fixture.nativeElement.textContent).toContain('3');
    expect(fixture.nativeElement.textContent).toContain('1');
  });

  it('should emit viewReport when the action button is clicked', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewTeamCardComponent);
    const emitSpy = vi.fn();

    fixture.componentInstance.viewReport.subscribe(emitSpy);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('p-button')).triggerEventHandler('onClick');

    expect(emitSpy).toHaveBeenCalled();
  });
});
