import { TestBed } from '@angular/core/testing';
import type {
  OrganizationEquipmentStatisticsOutput,
  OrganizationFacilityStatisticsOutput,
  OrganizationInspectionStatisticsOutput,
  OrganizationMembershipStatisticsOutput,
  OrganizationNonConformityStatisticsOutput,
} from '@core/models/organization';
import { OrganizationOverviewFocusBoardComponent } from './organization-overview-focus-board.component';

const MOCK_EQUIPMENT_STATS: OrganizationEquipmentStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/equipment',
  '@type': 'OrganizationEquipmentStatistics',
  totalCount: 6,
  inStockCount: 0,
  operationalCount: 5,
  underMaintenanceCount: 1,
  decommissionedCount: 0,
  countsByType: {
    smoke_detector: 4,
    hydrant: 2,
  },
} as OrganizationEquipmentStatisticsOutput;

const MOCK_FACILITY_STATS: OrganizationFacilityStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/facilities',
  '@type': 'OrganizationFacilityStatistics',
  totalCount: 4,
  activeCount: 4,
  archivedCount: 0,
  countsByType: {
    building: 3,
    site: 1,
  },
} as OrganizationFacilityStatisticsOutput;

const MOCK_INSPECTION_STATS: OrganizationInspectionStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/inspections',
  '@type': 'OrganizationInspectionStatistics',
  totalCount: 9,
  draftCount: 0,
  submittedCount: 0,
  closedCount: 7,
  passCount: 6,
  failCount: 2,
  partialCount: 1,
  countsByInspectorType: {
    user: 6,
    external: 3,
  },
  performedLast7DaysCount: 2,
  performedLast30DaysCount: 9,
} as OrganizationInspectionStatisticsOutput;

const MOCK_MEMBERSHIP_STATS: OrganizationMembershipStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/membership',
  '@type': 'OrganizationMembershipStatistics',
  pendingInvitationCount: 2,
} as OrganizationMembershipStatisticsOutput;

const MOCK_NON_CONFORMITY_STATS: OrganizationNonConformityStatisticsOutput = {
  '@id': '/api/organizations/org-1/statistics/non-conformities',
  '@type': 'OrganizationNonConformityStatistics',
  openCount: 3,
  inProgressCount: 1,
} as OrganizationNonConformityStatisticsOutput;

describe('OrganizationOverviewFocusBoardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationOverviewFocusBoardComponent],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewFocusBoardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should derive focus board items from the provided statistics', () => {
    const fixture = TestBed.createComponent(OrganizationOverviewFocusBoardComponent);
    fixture.componentRef.setInput('equipmentStatistics', MOCK_EQUIPMENT_STATS);
    fixture.componentRef.setInput('facilityStatistics', MOCK_FACILITY_STATS);
    fixture.componentRef.setInput('inspectionStatistics', MOCK_INSPECTION_STATS);
    fixture.componentRef.setInput('membershipStatistics', MOCK_MEMBERSHIP_STATS);
    fixture.componentRef.setInput('nonConformityStatistics', MOCK_NON_CONFORMITY_STATS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Top equipment type');
    expect(fixture.nativeElement.textContent).toContain('Smoke Detector');
    expect(fixture.nativeElement.textContent).toContain('Primary facility type');
    expect(fixture.nativeElement.textContent).toContain('Building');
    expect(fixture.nativeElement.textContent).toContain('67%');
    expect(fixture.nativeElement.textContent).toContain('Mostly handled by User');
    expect(fixture.nativeElement.textContent).toContain('2');
    expect(fixture.nativeElement.textContent).toContain('4 findings still need attention');
  });
});
