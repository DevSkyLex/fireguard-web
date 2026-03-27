import { TestBed } from '@angular/core/testing';
import type {
  OrganizationEquipmentStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationMembershipStatisticsOutput,
  OrganizationNonConformityStatisticsOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import { OrganizationOverviewOperationsPulseChartComponent } from './organization-overview-operations-pulse-chart.component';

const MOCK_OVERVIEW_STATS: OrganizationStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics',
  '@type': 'OrganizationStatistics',
  facilityCount: 5,
  activeFacilityCount: 4,
} as OrganizationStatisticsOutput;

const MOCK_EQUIPMENT_STATS: OrganizationEquipmentStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/equipment',
  '@type': 'OrganizationEquipmentStatistics',
  totalCount: 10,
  operationalCount: 7,
} as OrganizationEquipmentStatisticsOutput;

const MOCK_INSPECTION_STATS: OrganizationInspectionStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/inspections',
  '@type': 'OrganizationInspectionStatistics',
  totalCount: 8,
  closedCount: 6,
} as OrganizationInspectionStatisticsOutput;

const MOCK_MEMBERSHIP_STATS: OrganizationMembershipStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/membership',
  '@type': 'OrganizationMembershipStatistics',
  memberCount: 9,
  activeMemberCount: 8,
} as OrganizationMembershipStatisticsOutput;

const MOCK_NON_CONFORMITY_STATS: OrganizationNonConformityStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/non-conformities',
  '@type': 'OrganizationNonConformityStatistics',
  totalCount: 4,
  doneCount: 2,
  waivedCount: 1,
} as OrganizationNonConformityStatisticsOutput;

describe('OrganizationOverviewOperationsPulseChartComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationOverviewOperationsPulseChartComponent],
    }).overrideComponent(OrganizationOverviewOperationsPulseChartComponent, {
      set: {
        template: '<div></div>',
      },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewOperationsPulseChartComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose an unready state while overview statistics are missing', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewOperationsPulseChartComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['isReady']()).toBe(false);
  });

  it('should derive line datasets and plugins from statistics', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewOperationsPulseChartComponent);
    fixture.componentRef.setInput('overviewStatistics', MOCK_OVERVIEW_STATS);
    fixture.componentRef.setInput('equipmentStatistics', MOCK_EQUIPMENT_STATS);
    fixture.componentRef.setInput('inspectionStatistics', MOCK_INSPECTION_STATS);
    fixture.componentRef.setInput('membershipStatistics', MOCK_MEMBERSHIP_STATS);
    fixture.componentRef.setInput('nonConformityStatistics', MOCK_NON_CONFORMITY_STATS);
    fixture.detectChanges();

    const chartData = fixture.componentInstance['chartData']();
    const chartPlugins = fixture.componentInstance['chartPlugins']();

    expect(fixture.componentInstance['isReady']()).toBe(true);
    expect(chartData.labels).toEqual([
      'Facilities',
      'Assets',
      'Inspections',
      'Members',
      'Findings',
    ]);
    expect(chartData.datasets[0].data).toEqual([5, 10, 8, 9, 4]);
    expect(chartData.datasets[1].data).toEqual([4, 7, 6, 8, 3]);
    expect(chartPlugins).toHaveLength(1);
    expect(chartPlugins[0]?.id).toBe('operationsHoverLink');
  });
});
