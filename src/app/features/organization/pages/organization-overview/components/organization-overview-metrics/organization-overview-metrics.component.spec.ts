import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type {
  OrganizationEquipmentStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import { OrganizationOverviewMetricsComponent } from './organization-overview-metrics.component';

const MOCK_OVERVIEW_STATS: OrganizationStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics',
  '@type': 'OrganizationStatistics',
  facilityCount: 4,
  activeFacilityCount: 3,
} as OrganizationStatisticsOutput;

const MOCK_EQUIPMENT_STATS: OrganizationEquipmentStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/equipment',
  '@type': 'OrganizationEquipmentStatistics',
  totalCount: 5,
  operationalCount: 3,
  underMaintenanceCount: 1,
} as OrganizationEquipmentStatisticsOutput;

const MOCK_INSPECTION_STATS: OrganizationInspectionStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/inspections',
  '@type': 'OrganizationInspectionStatistics',
  performedLast30DaysCount: 9,
  performedLast7DaysCount: 2,
  closedCount: 7,
} as OrganizationInspectionStatisticsOutput;

describe('OrganizationOverviewMetricsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationOverviewMetricsComponent],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewMetricsComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show skeletons when loading', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewMetricsComponent);
    fixture.componentRef.setInput('showSkeleton', true);
    fixture.detectChanges();

    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));

    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should derive headline metrics from overview statistics', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewMetricsComponent);
    fixture.componentRef.setInput('overviewStatistics', MOCK_OVERVIEW_STATS);
    fixture.componentRef.setInput('equipmentStatistics', MOCK_EQUIPMENT_STATS);
    fixture.componentRef.setInput('inspectionStatistics', MOCK_INSPECTION_STATS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Active footprint');
    expect(fixture.nativeElement.textContent).toContain('75% online');
    expect(fixture.nativeElement.textContent).toContain('4 mapped facilities');
    expect(fixture.nativeElement.textContent).toContain('60% ready');
    expect(fixture.nativeElement.textContent).toContain('1 under maintenance');
    expect(fixture.nativeElement.textContent).toContain('2 this week');
  });
});
