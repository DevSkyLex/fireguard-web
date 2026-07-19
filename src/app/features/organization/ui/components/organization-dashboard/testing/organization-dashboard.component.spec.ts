import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access/services/organization-permission/organization-permission.service';
import type { ComplianceFacilityRow } from '@features/organization/features/compliance/models';
import { ComplianceSummaryStore } from '@features/organization/features/compliance/state';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardRecentIntervention,
} from '@features/organization/models';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { OrganizationDashboard } from '../organization-dashboard.component';

type OrganizationDashboardHarness = {
  readonly canReadDashboard: () => boolean;
  readonly canReadFacilities: () => boolean;
  readonly canReadMembers: () => boolean;
  readonly canReadEquipment: () => boolean;
  readonly canReadInspections: () => boolean;
  readonly canReadRecentInterventions: () => boolean;
  readonly canReadCompliance: () => boolean;
  readonly hasActivityMetrics: () => boolean;
  readonly hasActivityInsights: () => boolean;
  readonly showActivitySection: () => boolean;
  readonly showResourcesSection: () => boolean;
  openIntervention(intervention: OrganizationDashboardRecentIntervention): void;
  retryDashboard(): void;
  openCompliance(): void;
  retryCompliance(): void;
};

const mockDashboardStore = {
  facilityCount: signal('12'),
  memberCount: signal('7'),
  equipmentCount: signal('28'),
  inspectionCount: signal('4'),
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  facilitiesComparison: signal(null),
  membersComparison: signal(null),
  equipmentComparison: signal(null),
  inspectionsComparison: signal(null),
  facilitiesSparkline: signal(null),
  membersSparkline: signal(null),
  equipmentSparkline: signal(null),
  inspectionsSparkline: signal(null),
  recentInterventions: signal<readonly OrganizationDashboardRecentIntervention[]>([]),
  loadParams: signal<string | undefined>('org-1'),
  load: vi.fn(),
};

const mockComplianceSummaryStore = {
  facilities: signal<readonly ComplianceFacilityRow[]>([]),
  isQueryLoading: signal(false),
  queryHasError: signal(false),
  load: vi.fn(),
};

describe('OrganizationDashboard', () => {
  let grantedPermissions: Set<string>;
  let fixture: ComponentFixture<OrganizationDashboard>;
  const mockOrganizationPermissionService = {
    hasPermission: vi.fn((permission: string) => grantedPermissions.has(permission)),
  };
  const mockRouter = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class IntersectionObserver {
        observe(): void {}

        disconnect(): void {}

        unobserve(): void {}

        takeRecords(): never[] {
          return [];
        }
      },
    );

    grantedPermissions = new Set<string>();
    mockOrganizationPermissionService.hasPermission.mockClear();
    mockRouter.navigate.mockClear();
    mockDashboardStore.load.mockClear();
    mockComplianceSummaryStore.load.mockClear();

    TestBed.configureTestingModule({
      imports: [OrganizationDashboard],
      providers: [{ provide: Router, useValue: mockRouter }],
    }).overrideComponent(OrganizationDashboard, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: DashboardStore, useValue: mockDashboardStore },
          { provide: ComplianceSummaryStore, useValue: mockComplianceSummaryStore },
          {
            provide: OrganizationPermissionService,
            useValue: mockOrganizationPermissionService,
          },
        ],
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createComponent(): OrganizationDashboardHarness {
    fixture = TestBed.createComponent(OrganizationDashboard);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as OrganizationDashboardHarness;
  }

  function complianceLoadParams(): (() => string | null) | undefined {
    return mockComplianceSummaryStore.load.mock.calls[0]?.[0] as (() => string | null) | undefined;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should hide both sections when no dashboard or resource permissions are granted', () => {
    const component = createComponent();

    expect(component.canReadDashboard()).toBe(false);
    expect(component.hasActivityMetrics()).toBe(false);
    expect(component.hasActivityInsights()).toBe(false);
    expect(component.showActivitySection()).toBe(false);
    expect(component.showResourcesSection()).toBe(false);
  });

  it('should expose the dashboard sections when dashboard read access is granted', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.canReadDashboard()).toBe(true);
    expect(component.canReadFacilities()).toBe(true);
    expect(component.canReadMembers()).toBe(true);
    expect(component.canReadEquipment()).toBe(true);
    expect(component.canReadInspections()).toBe(true);
    expect(component.showActivitySection()).toBe(true);
    expect(component.showResourcesSection()).toBe(true);
  });

  it('should expose both sections when inspections and resources are readable', () => {
    grantedPermissions = new Set<string>([
      ORGANIZATION_PERMISSION.FACILITIES_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);
    const component = createComponent();

    expect(component.canReadFacilities()).toBe(true);
    expect(component.canReadEquipment()).toBe(true);
    expect(component.canReadInspections()).toBe(true);
    expect(component.hasActivityMetrics()).toBe(true);
    expect(component.hasActivityInsights()).toBe(true);
    expect(component.showActivitySection()).toBe(true);
    expect(component.showResourcesSection()).toBe(true);
  });

  it('should treat members-only access as an activity-only dashboard', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.MEMBERS_READ]);
    const component = createComponent();

    expect(component.canReadMembers()).toBe(true);
    expect(component.hasActivityMetrics()).toBe(true);
    expect(component.hasActivityInsights()).toBe(false);
    expect(component.showActivitySection()).toBe(true);
    expect(component.showResourcesSection()).toBe(false);
  });

  it('should gate recent interventions on the interventions read permission alone', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.canReadRecentInterventions()).toBe(false);
  });

  it('should treat interventions-only access as an activity-only dashboard', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const component = createComponent();

    expect(component.canReadRecentInterventions()).toBe(true);
    expect(component.hasActivityMetrics()).toBe(false);
    expect(component.showActivitySection()).toBe(true);
    expect(component.showResourcesSection()).toBe(false);
  });

  it('should route into the intervention workspace when a row is opened', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.INTERVENTIONS_READ]);
    const component = createComponent();

    component.openIntervention({ id: 'int-9' } as OrganizationDashboardRecentIntervention);

    expect(mockRouter.navigate).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'interventions',
      'int-9',
    ]);
  });

  it('should re-trigger the dashboard query on retry', () => {
    const component = createComponent();

    component.retryDashboard();

    expect(mockDashboardStore.load).toHaveBeenCalledWith('org-1');
  });

  // The compliance card is gated on `organization.compliance.read` in its own
  // right: the dashboard permission does not grant the compliance endpoint.
  it('should not render the compliance card without the compliance read permission', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    const component = createComponent();

    expect(component.canReadCompliance()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-compliance-by-site')).toBeNull();
  });

  it('should keep the compliance query parameterless without the permission', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    createComponent();

    expect(complianceLoadParams()?.()).toBeNull();
  });

  it('should render the compliance card on the compliance permission alone', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.COMPLIANCE_READ]);
    const component = createComponent();

    expect(component.canReadCompliance()).toBe(true);
    expect(component.hasActivityInsights()).toBe(false);
    expect(component.showActivitySection()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-compliance-by-site')).toBeTruthy();
    expect(complianceLoadParams()?.()).toBe('org-1');
  });

  it('should route into the compliance register from the card', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.COMPLIANCE_READ]);
    const component = createComponent();

    component.openCompliance();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'compliance']);
  });

  it('should re-trigger the compliance query on retry', () => {
    grantedPermissions = new Set<string>([ORGANIZATION_PERMISSION.COMPLIANCE_READ]);
    const component = createComponent();

    component.retryCompliance();

    expect(mockComplianceSummaryStore.load).toHaveBeenCalledWith('org-1');
  });
});
