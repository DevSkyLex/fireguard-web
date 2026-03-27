import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
  OrganizationEquipmentStatisticsOutput,
  OrganizationFacilityStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationMembershipStatisticsOutput,
  OrganizationNonConformityStatisticsOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import { OrganizationOverviewOperationsPulseChartComponent } from '../organization-overview-operations-pulse-chart/organization-overview-operations-pulse-chart.component';
import { OrganizationOverviewOperationsCardComponent } from './organization-overview-operations-card.component';

@Component({
  selector: 'app-organization-overview-operations-pulse-chart',
  standalone: true,
  template: '',
})
class TestOrganizationOverviewOperationsPulseChartStubComponent {
  public readonly overviewStatistics = input<OrganizationStatisticsOutput | null>(null);
  public readonly equipmentStatistics =
    input<OrganizationEquipmentStatisticsOutput | null>(null);
  public readonly inspectionStatistics =
    input<OrganizationInspectionStatisticsOutput | null>(null);
  public readonly membershipStatistics =
    input<OrganizationMembershipStatisticsOutput | null>(null);
  public readonly nonConformityStatistics =
    input<OrganizationNonConformityStatisticsOutput | null>(null);
}

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
  underMaintenanceCount: 2,
} as OrganizationEquipmentStatisticsOutput;

const MOCK_FACILITY_STATS: OrganizationFacilityStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/facilities',
  '@type': 'OrganizationFacilityStatistics',
  totalCount: 4,
  activeCount: 4,
  archivedCount: 0,
  countsByType: {
    building: 2,
    site: 1,
    floor: 1,
  },
} as OrganizationFacilityStatisticsOutput;

const MOCK_INSPECTION_STATS: OrganizationInspectionStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/inspections',
  '@type': 'OrganizationInspectionStatistics',
  totalCount: 8,
  closedCount: 6,
  passCount: 5,
} as OrganizationInspectionStatisticsOutput;

const MOCK_MEMBERSHIP_STATS: OrganizationMembershipStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/membership',
  '@type': 'OrganizationMembershipStatistics',
  memberCount: 10,
  activeMemberCount: 9,
  roleCount: 3,
} as OrganizationMembershipStatisticsOutput;

const MOCK_NON_CONFORMITY_STATS: OrganizationNonConformityStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/non-conformities',
  '@type': 'OrganizationNonConformityStatistics',
  totalCount: 5,
  openCount: 1,
  inProgressCount: 1,
  doneCount: 2,
  waivedCount: 1,
} as OrganizationNonConformityStatisticsOutput;

describe('OrganizationOverviewOperationsCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationOverviewOperationsCardComponent],
    }).overrideComponent(OrganizationOverviewOperationsCardComponent, {
      remove: { imports: [OrganizationOverviewOperationsPulseChartComponent] },
      add: { imports: [TestOrganizationOverviewOperationsPulseChartStubComponent] },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewOperationsCardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should derive operations readouts from the provided statistics', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewOperationsCardComponent);
    fixture.componentRef.setInput('overviewStatistics', MOCK_OVERVIEW_STATS);
    fixture.componentRef.setInput('equipmentStatistics', MOCK_EQUIPMENT_STATS);
    fixture.componentRef.setInput('facilityStatistics', MOCK_FACILITY_STATS);
    fixture.componentRef.setInput('inspectionStatistics', MOCK_INSPECTION_STATS);
    fixture.componentRef.setInput('membershipStatistics', MOCK_MEMBERSHIP_STATS);
    fixture.componentRef.setInput('nonConformityStatistics', MOCK_NON_CONFORMITY_STATS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facilities');
    expect(fixture.nativeElement.textContent).toContain('4/5');
    expect(fixture.nativeElement.textContent).toContain('3 tracked types');
    expect(fixture.nativeElement.textContent).toContain('7/10');
    expect(fixture.nativeElement.textContent).toContain('2 in maintenance');
    expect(fixture.nativeElement.textContent).toContain('6/8');
    expect(fixture.nativeElement.textContent).toContain('9/10');
    expect(fixture.nativeElement.textContent).toContain('3/5');
    expect(fixture.nativeElement.textContent).toContain('2 still open');
  });
});
