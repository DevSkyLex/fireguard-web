import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { OrganizationNonConformityStatisticsOutput } from '@core/models/organization';
import { OrganizationOverviewRiskCardComponent } from './organization-overview-risk-card.component';

const MOCK_NON_CONFORMITY_STATS: OrganizationNonConformityStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/non-conformities',
  '@type': 'OrganizationNonConformityStatistics',
  totalCount: 12,
  openCount: 4,
  inProgressCount: 3,
  doneCount: 4,
  waivedCount: 1,
  lowSeverityCount: 3,
  mediumSeverityCount: 4,
  highSeverityCount: 3,
  criticalSeverityCount: 2,
} as OrganizationNonConformityStatisticsOutput;

describe('OrganizationOverviewRiskCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationOverviewRiskCardComponent],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewRiskCardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show a skeleton when statistics are not available', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewRiskCardComponent);
    fixture.detectChanges();

    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));

    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should derive the risk summary and meter values from statistics', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewRiskCardComponent);
    fixture.componentRef.setInput('statistics', MOCK_NON_CONFORMITY_STATS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Open');
    expect(fixture.nativeElement.textContent).toContain('In progress');
    expect(fixture.nativeElement.textContent).toContain('Done');
    expect(fixture.nativeElement.textContent).toContain('Waived');
    expect(fixture.nativeElement.textContent).toContain('4');
    expect(fixture.nativeElement.textContent).toContain('3');

    expect(fixture.componentInstance['meterMax']()).toBe(12);
    expect(fixture.componentInstance['chartMeterValues']()).toEqual([
      { label: 'Critical', value: 2, color: '#ef4444' },
      { label: 'High', value: 3, color: '#f97316' },
      { label: 'Medium', value: 4, color: '#f59e0b' },
      { label: 'Low', value: 3, color: '#22c55e' },
    ]);
  });
});
